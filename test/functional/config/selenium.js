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

        capabilities: {
            name: 'single_test',
            build: 'intern-browserstack',
            "browserstack.local": false,
            fixSessionCapabilities: false
        },
        tunnel: 'BrowserStackTunnel',
        tunnelOptions: {
            verbose: true,
            username: process.env.BROWSERSTACK_USERNAME || 'BROWSERSTACK_USERNAME',
            accessKey: process.env.BROWSERSTACK_ACCESS_KEY || 'BROWSERSTACK_ACCESS_KEY'
        },
        reporters: [{id: 'JUnit', filename: 'test/functional/test-reports/' + (new Date().getFullYear())+'-'+(new Date().getMonth()+1)+'-'+(new Date().getDate())+'_'+(new Date().getHours())+'-'+(new Date().getMinutes())+'-'+(new Date().getSeconds()) + '_report.xml'}]
    }
});
