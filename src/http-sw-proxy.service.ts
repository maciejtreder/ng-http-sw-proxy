import {
    Http,
    Response,
    RequestOptionsArgs,
    ResponseOptions,
    ResponseType,
    ResponseOptionsArgs,
    Headers,
    ConnectionBackend,
    RequestOptions,
    Request,
    RequestMethod,
    BaseRequestOptions
    } from '@angular/http';

import { ApplicationRef } from '@angular/core';
import { Observable, Observer } from 'rxjs';

import { Store } from './store';
import { ConnectivityService } from './connectivity.service';

function mergeOptions(
    defaultOpts: BaseRequestOptions, providedOpts: RequestOptionsArgs | undefined,
    method: RequestMethod, url: string) {
    const newOptions = defaultOpts;
    if (providedOpts) {
        // Hack so Dart can used named parameters
        return newOptions.merge(new RequestOptions({
                method: providedOpts.method || method,
                url: providedOpts.url || url,
                search: providedOpts.search,
                params: providedOpts.params,
                headers: providedOpts.headers,
                body: providedOpts.body,
                withCredentials: providedOpts.withCredentials,
                responseType: providedOpts.responseType
            }));
    }
    return newOptions.merge(new RequestOptions({method, url}));
}

export class HttpSwProxy extends Http {

    private obsRegister: Map<any, Observer<Response>> = new Map<any, Observer<Response>>();

    private isConnected: boolean = false;

    constructor(backend: ConnectionBackend, private defaultOptions: RequestOptions, private appref: ApplicationRef, private store: Store, private connectivity: ConnectivityService) {
        super(backend, defaultOptions);
        this.connectivity.hasNetworkConnection().subscribe(connected => this.isConnected = connected);
    }

    request(url: string | Request, options?: RequestOptionsArgs): Observable<Response> {
        if (typeof url == 'string') {
            url = new Request(mergeOptions(this.defaultOptions, options, RequestMethod.Get, <string>url));
        }
        return this.resolveRequest(url);
    }

    private resolveRequest(request: Request): Observable<Response> {
        if (this.isConnected)
            return super.request(request);
        else
            return this.passToDB(request);
    }

    private passToDB(request: Request): Observable<Response> {
        return Observable.create((subject:Observer<Response>) => {
            this.store.requests("readwrite").then(transaction => transaction.put(request)).then((key) => {
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
                    this.obsRegister.set(key, subject);
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
        this.connectivity.hasNetworkConnection().filter(connection => connection).subscribe(() => {
            this.store.requests('readwrite').then(transaction => {
                transaction.getAll().then((requests: any[]) => {
                    requests.forEach(request => {
                        transaction.delete(request.id);
                        if (this.obsRegister.has(request.id)) {
                            let toSend: Request = new Request({
                                method: request.method,
                                url: request.url,
                                withCredentials: request.withCredentials,
                                headers: request.headers,
                                body: request._body
                            });

                            super.request(toSend).subscribe(resp => this.obsRegister.get(request.id).next(resp));
                        }
                    });
                });
            });
        });
    }
}
