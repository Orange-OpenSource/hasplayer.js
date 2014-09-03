Custom.di.CustomContext = function () {
    "use strict";

    return {
        system : undefined,
           
        setup : function () {
            //call parent setup
            Custom.di.CustomContext.prototype.setup.call(this);

            // erase the "parser" with CustomParser.
            this.system.mapClass('parser', Custom.dependencies.CustomParser);
            // Then, our parser will choose which parser call between Dash and Mss. To do that, it need references
            this.system.mapClass('dashParser', Dash.dependencies.DashParser);
            this.system.mapClass('mssParser', Mss.dependencies.MssParser);

            // creation of a context manager to plug some specific parts of the code
            this.system.mapSingleton('contextManager', Custom.modules.ContextManager);
            
            // here replace dash or streaming modules by ours
            this.system.mapClass('fragmentLoader', Custom.dependencies.CustomFragmentLoader);
            this.system.mapSingleton('metricsModel', Custom.models.CustomMetricsModel);
            this.system.mapSingleton('metricsExt', Custom.dependencies.CustomMetricsExtensions);
            this.system.mapSingleton('abrController', Custom.dependencies.CustomAbrController);
            this.system.mapClass('bufferController', Custom.dependencies.CustomBufferController);

            // plug message handler. When the message is notify, the contextManager is called
            this.system.mapHandler('setContext', 'contextManager', 'setContext');
        }
    };
};

Custom.di.CustomContext.prototype = new Dash.di.DashContext();
Custom.di.CustomContext.prototype.constructor = Custom.di.CustomContext;
