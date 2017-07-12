import { Observable } from 'rxjs';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common'

export class ConnectivityService {
    public hasNetworkConnection():Observable<boolean> {
        if (!isPlatformBrowser(PLATFORM_ID))
            return Observable.of(true);
        return Observable.merge(
            Observable.of(navigator.onLine),
            Observable.fromEvent(window, 'online').map(() => true),
            Observable.fromEvent(window, 'offline').map(() => false)
        );
    }
}