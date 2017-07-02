import * as idb from 'idb';
import { Store } from '../src/store';
import { RestRequest, IdRestRequest } from '../src/rest-request';
import { RestResponse } from '../src/rest-response';
import { ReplaySubject } from 'rxjs';


export function HttpSwProxyPlugin() {
    return (worker:any) => new HttpSwProxyPluginImpl(worker);
}

export class HttpSwProxyPluginImpl {
    setup (ops:any) {}

    private promiseRegister: Map<number, Promise<boolean>> = new Map<number, Promise<boolean>>();

    private store: Store = new Store();

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

    private getHeaders(body:any): Headers {
        let headers = new Headers();
        if (body != null)
            headers.set('Content-Type', this.getContentType(body));
        return headers;
    }

    constructor(private worker:any){
        self.addEventListener('sync', (event:any) => {
            event.waitUntil(
                this.store.requests('readonly').then(requests => requests.getAll()).then((requestes: IdRestRequest[]) => {
                    return Promise.all(requestes.map((request: IdRestRequest) => {
                        let promiseResolve: any;
                        this.promiseRegister.set(request.id, <Promise<boolean>> new Promise<boolean>(resolve => promiseResolve = resolve));
                        return fetch(request.url, {
                            method: request.method,
                            body: JSON.stringify(request.body),
                            cache: "no-store" as RequestCache,
                            headers: this.getHeaders(request.body)
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
                    }));
                })
            );
        });

        self.addEventListener('message', event => {
            if(typeof event.data != 'string' || event.data.indexOf("give me response ") == -1)
                return;
            let key:string = event.data.substr(17);
            let interval: any;
            interval = setInterval(() => {
                if (this.promiseRegister.has(parseInt(key))) {
                    clearInterval(interval);
                    this.promiseRegister.get(parseInt(key)).then(value => {
                        event.ports[0].postMessage("response is waiting: " + key);
                        this.promiseRegister.delete(parseInt(key));
                    });
                }
            }, 1);
        })
    }
}