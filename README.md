[![npm version](https://badge.fury.io/js/ng-http-sw-proxy.svg)](https://badge.fury.io/js/ng-http-sw-proxy)
[![Build Status](https://travis-ci.org/maciejtreder/ng-http-sw-proxy.svg?branch=master)](https://travis-ci.org/maciejtreder/serverless-apigw-binary)

# ng-http-sw-proxy

This service proxies Angular http traffic via service worker. It is collecting sent http requests in IndexedDB and providing them to service-worker 'sync' job.

### Workflow

![ng-http-sw-proxy flowchart](https://raw.githubusercontent.com/maciejtreder/ng-http-sw-proxy/master/ng-http-sw-proxy-flow.png)

### Installation

```bash
npm install --save ng-http-sw-proxy
cp -r node_modules/ng-http-sw-proxy/service-worker ./src
```

### Compilation

When compilation of your project is done, you need to combine service worker script. Rollup will automatically move it to your `dist` folder.
```bash
node src/service-worker/rollup.js
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

After importing HttpSwProxyModule @angular http service is shadowed with the new one, from ng-http-sw-proxy.
component/services looks like previous:
```
import { Http } from '@angular/http';

@Component({
/* component setup*/
})
export class HttpProxyDemoComponent {

    public response: Observable<any>;

    constructor(private http: Http) {}

    public sendPost():void {
        this.response = this.http.post("testPost", {exampleKey: "exampleValue"}).map(res => res.json());
    }
}
```

Finally initialize service worker in your main file:
```
platformBrowserDynamic().bootstrapModule(BrowserAppModule).then(() => {
    if (process.env.NODE_ENV == 'production' && 'serviceWorker' in navigator)
        navigator.serviceWorker.register('./worker-basic.min.js').then(() => navigator.serviceWorker.ready);
});
```

### Examples

* [Angular Universal + AWS Lambda + API Gateway - binary support example](https://github.com/maciejtreder/angular-universal-serverless) ; [ Pass http requests via service worker - live demo ](https://www.angular-universal-serverless.maciejtreder.com/httpProxy)


Something missing? More documentation? Bug fixes? All PRs welcome at https://github.com/maciejtreder/ng-http-sw-proxy