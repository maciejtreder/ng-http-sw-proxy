import { async, inject, TestBed } from '@angular/core/testing';
import { HttpSwProxy } from './http-sw-proxy.service';
import { BaseRequestOptions, Http } from '@angular/http';
import { ApplicationRef } from '@angular/core';
import { Store } from './store';
import { ConnectivityService } from './connectivity.service';
import * as sinon from 'sinon';
import { MockBackend } from '@angular/http/testing';
import { ReplaySubject } from 'rxjs/ReplaySubject';

let connectionStub : any;
const connectionObs: ReplaySubject<boolean> = new ReplaySubject();

describe('sw-proxy tests', () => {
    beforeEach(() => {
        connectionStub = sinon.createStubInstance(ConnectivityService)
        connectionStub.hasNetworkConnection.returns(connectionObs);

        TestBed.configureTestingModule({
            providers: [
                Store,
                { provide: ConnectivityService, useValue: connectionStub },
                ApplicationRef,
                {
                    provide: Http, useFactory: (backend: MockBackend, options: BaseRequestOptions, appRef: ApplicationRef, store: Store, connService:ConnectivityService) => {
                    return new HttpSwProxy(backend, options, appRef, store, connService);
                },
                    deps: [MockBackend, BaseRequestOptions, ApplicationRef, Store, ConnectivityService]
                },
                MockBackend,
                BaseRequestOptions,
            ]
        });
    });

    it ('Should be able to construct', async(inject([Http], (http: Http) => {
        expect(http).toBeDefined();
    })));

    it ('Should queue requests when is offline', async(inject([Http, Store], (http: Http, store:Store) => {
        connectionObs.next(false);
        const spy = sinon.spy(store, 'requests');

        http.get('someUrl').subscribe();
        expect(spy.calledOnce).toBeTruthy('Request was not stored in DB');
    })));

    it ('Should not queue requests when is online', async(inject([Http, Store], (http: Http, store:Store) => {
        connectionObs.next(true);
        const spy = sinon.spy(store, 'requests');

        http.get('someUrl').subscribe();
        expect(spy.calledOnce).toBeFalsy('Request was stored in DB');
    })));
});