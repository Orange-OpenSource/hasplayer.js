define({

    local: {
        proxyUrl: 'http://127.0.0.1:3555',
        proxyPort: 3555,
        tunnel: 'NullTunnel',
        tunnelOptions: {
            hostname: '127.0.0.1',
            port: '4444',
            verbose: true
        },
        reporters: ['Runner'],
        capabilities: {
            'selenium-version': '2.48.2'
        },
        leaveRemoteOpen:'fail'
    },

    remote: {
        tunnel: 'BrowserStackTunnel',
        tunnelOptions: {
            username:'bertrandberthelo1',
            accessKey:'n1NVa67JsxQMqFN5sdJq'
        },
        reporters: [{id: 'JUnit', filename: 'test/functional/test-reports/' + (new Date().getFullYear())+'-'+(new Date().getMonth()+1)+'-'+(new Date().getDate())+'_'+(new Date().getHours())+'-'+(new Date().getMinutes())+'-'+(new Date().getSeconds()) + '_report.xml'}],
        capabilities: {}
    }
});
