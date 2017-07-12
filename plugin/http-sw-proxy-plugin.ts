import * as idb from 'idb';
import { Store } from '../src/store';
import { ReplaySubject } from 'rxjs';


export function HttpSwProxyPlugin() {
    return (worker:any) => new HttpSwProxyPluginImpl(worker);
}

export class HttpSwProxyPluginImpl {
    setup (ops:any) {}

    private promiseRegister: Map<number, Promise<boolean>> = new Map<number, Promise<boolean>>();

    private store: Store = new Store();

    private getMethod(id: number): string {
        switch (id) {
            case 0: return 'GET';
            case 1: return 'POST';
            case 2: return 'PUT';
            case 3: return 'DELETE';
            case 4: return 'OPTIONS';
            case 5: return 'HEAD';
            case 6: return 'PATCH';
        }
    }

    private getContentType(body:any):string {
        if (body instanceof URLSearchParams)
            return 'application/x-www-form-urlencoded';
        else if (body instanceof FormData)
            return 'multipart/form-data';
        else if (body instanceof Blob)
            return 'application/octet-stream';
        else if (body && typeof body === 'object')
            return 'application/json';
        else
            return 'text/plain';
    }

    private getBody(body:any):any {
        if (body && typeof body === 'object')
            return JSON.stringify(body)
        return body;
    }

    private getHeaders(request:any): Headers {
        let headers = new Headers();
        if (request._body != null)
            headers.set('Content-Type', this.getContentType(request._body));
        request.headers._headers.forEach((value: any, key:any) => headers.set(key, value));
        return headers;
    }

    constructor(private worker:any){
        self.addEventListener('sync', (event:any) => {
            event.waitUntil(
                this.store.requests('readonly').then(requests => requests.getAll()).then((requestes: any[]) => {
                    return Promise.all(requestes.map((request) => {
                        let promiseResolve: any;
                        this.promiseRegister.set(request.id, <Promise<boolean>> new Promise<boolean>(resolve => promiseResolve = resolve));
                        return fetch(request.url, {
                            method: this.getMethod(request.method),
                            body: this.getBody(request._body),
                            cache: "no-store" as RequestCache,
                            headers: this.getHeaders(request)
                        }).then(response => {
                            this.store.requests('readwrite').then(requests => requests.delete(request.id));
                            var respToStore = {
                                type: response.type,
                                bodyUsed: response.bodyUsed,
                                body: {},
                                headers: new Map<string, string>(),
                                ok: response.ok,
                                status: response.status,
                                statusText: response.statusText,
                                url: response.url
                            }

                            let bodyPromise;
                            if(response.headers.has('content-type')) {
                                if(response.headers.get('content-type').indexOf('json') > -1 ) {
                                    bodyPromise = response.json();
                                }
                                else if(response.headers.get('content-type').indexOf('text') > -1 ) {
                                    bodyPromise = response.text();
                                }
                                else if(response.headers.get('content-type').indexOf('application/x-www-form-urlencoded') > -1 ) {
                                    bodyPromise = response.formData();
                                }
                                else if(response.headers.get('content-type').indexOf('application/octet-stream') > -1 ) {
                                    bodyPromise = response.blob();
                                }
                                else {
                                    bodyPromise = response.arrayBuffer();
                                }
                            }
                            response.headers.forEach((key: string, value:string) => {
                                respToStore.headers.set(key, value);
                            });
                            return bodyPromise.then((body:any) => {
                                respToStore.body = body;
                                this.store.responses('readwrite').then(responses => {
                                    responses.put({id: request.id, response: respToStore});
                                    promiseResolve(true);
                                });
                                return this.store.closeTransaction();
                            })
                        });
                    })).catch(err => {
                        console.error(err);
                    });
                })
            );
        });

        self.addEventListener('message', event => {
            if(typeof event.data == 'string' && event.data.indexOf("give me response ") > -1) {
                let key:string = event.data.substr(17);
                let interval:any;
                interval = setInterval(() => {
                    if (this.promiseRegister.has(parseInt(key))) {
                        clearInterval(interval);
                        this.promiseRegister.get(parseInt(key)).then(value => {
                            event.ports[0].postMessage("response is waiting: " + key);
                            this.promiseRegister.delete(parseInt(key));
                        });
                    }
                }, 1);
            }
        })
    }
}