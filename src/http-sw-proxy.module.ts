import { Http, RequestOptions, XHRBackend, HttpModule } from '@angular/http';
import { NgModule, ApplicationRef } from '@angular/core'

import { HttpSwProxy } from './http-sw-proxy.service';
import { Store } from './store';
import { ConnectivityService } from './connectivity.service';

export function httpFactory(backend: XHRBackend, defaultOptions: RequestOptions, appref: ApplicationRef, store: Store, connectivity: ConnectivityService) {
    return new HttpSwProxy(backend, defaultOptions, appref, store, connectivity);
}

@NgModule({
    imports: [
        HttpModule
    ],
    providers: [
        Store,
        ConnectivityService,
        {
            provide: Http,
            useFactory: httpFactory,
            deps: [XHRBackend, RequestOptions, ApplicationRef, Store, ConnectivityService]
        }
    ]
})
export class HttpSwProxyModule {}