import { Observable } from 'rxjs';
import { PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common'

export class ConnectivityService {
    private platformId: Object;
    constructor(@Inject(PLATFORM_ID) platformId: any) {
        this.platformId = platformId;
    }
    public hasNetworkConnection():Observable<boolean> {
        if (!isPlatformBrowser(this.platformId))
            return Observable.of(true);
        return Observable.merge(
            Observable.of(navigator.onLine),
            Observable.fromEvent(window, 'online').map(() => true),
            Observable.fromEvent(window, 'offline').map(() => false)
        );
    }
}