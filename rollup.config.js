export default {
    entry: 'dist/index.js',
    dest: 'dist/bundles/ng-http-sw-proxy.umd.js',
    sourceMap: false,
    format: 'umd',
    moduleName: 'ng.http-sw-proxy',
    globals: {
        '@angular/core': 'ng.core',
        '@angular/common': 'ng.common',
        '@angular/http': 'ng.http',
        '@angular/service-worker': 'ng.service-worker',
        'idb': 'idb',
        'rxjs': 'Rx',
        'rxjs/Observable': 'Rx',
        'rxjs/ReplaySubject': 'Rx',
        'rxjs/add/operator/map': 'Rx.Observable.prototype',
        'rxjs/add/operator/mergeMap': 'Rx.Observable.prototype',
        'rxjs/add/observable/fromEvent': 'Rx.Observable',
        'rxjs/add/observable/of': 'Rx.Observable'
    },
    external: ['@angular/core', '@angular/common', '@angular/http', '@angular/service-worker', 'idb', 'rxjs']
}