import { HttpModule } from '@angular/http';
import { NgModule } from '@angular/core'

import { HttpSwProxy } from './http-sw-proxy.service';
import { Store } from './store';


@NgModule({
    imports: [
        HttpModule
    ],
    providers: [HttpSwProxy, Store]
})
export class HttpSwProxyModule {}