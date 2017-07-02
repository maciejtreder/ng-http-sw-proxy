[![npm version](https://badge.fury.io/js/ng-http-sw-proxy.svg)](https://badge.fury.io/js/ng-http-sw-proxy)
# ng-http-sw-proxy

This service proxies Angular http traffic via service worker. It is collecting sent http requests in IndexedDB and providing them to service-worker 'sync' job.

### Workflow

![ng-http-sw-proxy flowchart](https://raw.githubusercontent.com/maciejtreder/ng-http-sw-proxy/master/ng-http-sw-proxy-flow.png)

### Installation

```bash
npm install --save ng-http-sw-proxy
```

### Usage

in your main module:
```
import { HttpSwProxyModule } from 'ng-http-sw-proxy';

@NgModule({
  imports: [
    HttpSwProxyModule,
    /* other modules*/
  ],
})
export class AppModule {
}
```

in the component/services:
```
import { HttpSwProxy } from 'ng-http-sw-proxy';

@Component({
/* component setup*/
})
export class HttpProxyDemoComponent {

    public response: Observable<any>;

    constructor(private http: HttpSwProxy) {}

    public sendPost():void {
        this.response = this.http.post("testPost", {exampleKey: "exampleValue"}).map(res => res.json());
    }
}
```

### Examples

* [Angular Universal + AWS Lambda + API Gateway - binary support example](https://github.com/maciejtreder/angular-universal-serverless) ; [ Pass http requests via service worker - live demo ](https://www.angular-universal-serverless.maciejtreder.com/httpProxy)


Something missing? More documentation? Bug fixes? All PRs welcome at https://github.com/maciejtreder/serverless-apigw-binary