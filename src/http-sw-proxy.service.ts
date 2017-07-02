import { Http, Response, RequestOptionsArgs, ResponseOptions, ResponseType, ResponseOptionsArgs, Headers } from '@angular/http';

import { Injectable, Inject, PLATFORM_ID, ApplicationRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common'
import { Observable, Observer } from 'rxjs';

import { Store } from './store';
import { RestRequest, methods, IdRestRequest } from './rest-request';

@Injectable()
export class HttpSwProxy {

    private obsRegister: Map<any, Observer<Response>> = new Map<any, Observer<Response>>();


    private platformId: Object;
    private isConnected: boolean = false;

    constructor(@Inject(PLATFORM_ID)  platformId: Object, private http: Http, private store: Store, private appref: ApplicationRef) {
        this.platformId = platformId; //Intellij type checking workaround.
        this.hasNetworkConnection().subscribe(connected => this.isConnected = connected);
    }

    public get(url: string, options?: RequestOptionsArgs): Observable<Response> {
        return this.resolveRequest({method: methods.GET, url: url, options: options});
    }

    public post(url: string, body: any, options?: RequestOptionsArgs): Observable<Response> {
        return this.resolveRequest({method: methods.POST, url, options, body});
    }

    public delete(url: string,options?: RequestOptionsArgs): Observable<Response> {
        return this.resolveRequest({method: methods.DELETE, url, options});
    }

    public head(url: string, options?: RequestOptionsArgs): Observable<Response> {
        return this.resolveRequest({method: methods.HEAD, url, options});
    }

    public options(url: string, options?: RequestOptionsArgs): Observable<Response> {
        return this.resolveRequest({method: methods.OPTIONS, url, options});
    }

    public patch(url: string, body?: any, options?: RequestOptionsArgs): Observable<Response> {
        return this.resolveRequest({method: methods.PATCH, url, options, body});
    }

    public put(url: string, body?: any, options?: RequestOptionsArgs): Observable<Response> {
        return this.resolveRequest({method: methods.PUT, url, options, body});
    }

    public request(url: string, options?: RequestOptionsArgs): Observable<Response> {
        return this.resolveRequest({method: methods.REQUEST, url, options});
    }

    public hasNetworkConnection(): Observable<boolean> {
        if(!isPlatformBrowser(this.platformId))
            return Observable.of(true);
        return Observable.merge(
            Observable.of(navigator.onLine),
            Observable.fromEvent(window, 'online').map(() => true),
            Observable.fromEvent(window, 'offline').map(() => false)
        );
    }

    private resolveRequest(request: RestRequest): Observable<Response> {
        if (this.isConnected)
            return this.resolveNow(request);
        else
            return this.passThroughDB(request);
    }

    private resolveNow(request: RestRequest): Observable<Response> {
        let obs: Observable<Response>;
        switch(request.method) {
            default: {
                obs = this.http.get(request.url, request.options);
                break;
            }
            case methods.POST: {
                obs = this.http.post(request.url, request.body, request.options);
                break;
            }
            case methods.DELETE: {
                obs = this.http.delete(request.url, request.options)
                break;
            }
            case methods.HEAD: {
                obs = this.http.head(request.url, request.options);
                break;
            }
            case methods.OPTIONS: {
                obs = this.http.options(request.url, request.options);
                break;
            }
            case methods.PATCH: {
                obs = this.http.patch(request.url, request.body, request.options);
                break;
            }
            case methods.PUT: {
                obs = this.http.put(request.url, request.body, request.options);
                break;
            }
            case methods.REQUEST: {
                obs = this.http.request(request.url, request.options);
                break;
            }
        }
        return obs;
    }

    private passThroughDB(request: RestRequest): Observable<Response> {
        return Observable.create((subject:Observer<Response>) => {
            this.store.requests("readwrite").then(transaction => transaction.put(request)).then((key) => {
                this.obsRegister.set(key, subject);
                if(process.env.NODE_ENV == 'production' && 'serviceWorker' in navigator) {
                    navigator.serviceWorker.ready.then((swRegistration: ServiceWorkerRegistration) => {
                        swRegistration.sync.register('request');
                        let messageChannel: MessageChannel = new MessageChannel();
                        messageChannel.port1.onmessage = (event: any) => {
                            this.getResponseFromDB(key).subscribe(resp => subject.next(resp));
                        }
                        navigator.serviceWorker.controller.postMessage("give me response " + key, [messageChannel.port2]);
                    });
                }
                else {
                    this.waitForConnectionAndSend();
                }
            });
        });
    }

    private getResponseFromDB(messageId: any): Observable<Response> {
        return Observable.create((observer: Observer<Response>) => {
            this.store.responses('readwrite').then(transaction => transaction.get(messageId).then(entry => {
                transaction.delete(messageId);
                let response: Response;
                let headers = new Headers();
                let responseType:ResponseType = ResponseType.Basic;

                for (var headerPair of entry.response.headers.entries()) {
                    headers.set(headerPair[0], headerPair[1]);
                }

                switch (entry.response.type) {
                    case "basic":
                    {
                        responseType = ResponseType.Basic;
                    }
                }

                let responseOptions:ResponseOptions = new ResponseOptions({
                        body: <Object> entry.response.body,
                        status: <number> entry.response.status,
                        headers: headers,
                        statusText: <string> entry.response.statusText,
                        type: responseType,
                        url: <string> entry.response.url
                    } as ResponseOptionsArgs);

                response = new Response(responseOptions);

                if(response.ok)
                    observer.next(<Response> response);
                else
                    observer.error(<Response> response);
                observer.complete;
                this.appref.tick();
            }))
        });
    }


    private waitForConnectionAndSend():void {
        this.hasNetworkConnection().filter(connection => connection).subscribe(() => {
            this.store.requests('readwrite').then(transaction => {
                transaction.getAll().then((requests: any[]) => {
                    requests.forEach(request => {
                        transaction.delete(request.id);
                        if (this.obsRegister.has(request.id))
                            this.resolveNow(request).subscribe(resp => this.obsRegister.get(request.id).next(resp));
                    });
                });
            });
        });
    }
}
