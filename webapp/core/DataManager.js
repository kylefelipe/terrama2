var tcpManager = require("./TcpManager")();
var SIGNALS = require("./Signals");
var modelsFn = require("../models");
var exceptions = require('./Exceptions');
var Promise = require('bluebird');
var Utils = require('./Utils');

// Helpers
Array.prototype.removeItem = function (key) {
  var tmp = this.splice(key, 1);
  if (tmp.length == 1)
    return tmp[0];
  return null;
};

Array.prototype.getItemByParam = function(object) {
  var key = Object.keys(object)[0];
  return this.find(function(item){
    return (item[key] == object[key]);
  });
};

var models = null;
var actualConfig = {};

/**
 * Controller of the system index.
 * @class DataManager
 *
 * @property {object} data - Object for storing model values, such DataProviders, DataSeries and Projects.
 * @property {object} connection - 'sequelize' module connection.
 */
var DataManager = {
  data: {
    dataSeries: [],
    dataProviders: [],
    projects: []
  },
  connection: null,

  /**
   * It initializes DataManager, loading models and database synchronization
   * @param {function} callback - A callback function for waiting async operation
   */
  init: function(callback) {
    var app = require('../app');
    var Sequelize = require("sequelize");
    var databaseConfig = app.get("databaseConfig");

    if (!Object.is(databaseConfig, actualConfig)) {
      actualConfig = databaseConfig;

      var connection = new Sequelize(actualConfig.database,
        actualConfig.username,
        actualConfig.password,
        actualConfig);

      models = modelsFn();
      models.load(connection);

      this.connection = connection;

      var fn = function() {
        // todo: insert default values in database
        models.db.DataProviderType.create({name: "FTP", description: "Desc Type1"}).then(function(providerType){
          models.db.DataProviderIntent.create({name: "Intent1", description: "Desc Intent2"}).then(function(intent){
            models.db.DataFormat.create({name: "Format 1", description: "Format Description"}).then(function(format) {
              models.db.DataSeriesType.create({name: "DS Type 1", description: "DS Type1 Desc"}).then(function(dsType) {
                callback();
              }).catch(function(err) {
                callback();
              })
            }).catch(function(err) {
              callback();
            });
          }).catch(function(e){
            callback();
          });
        }).catch(function(e){
          callback();
        });
      };

      connection.sync().then(function () {
        fn();
      }, function(err) {
        fn();
      });
    }
    else
      callback();
  },

  load: function() {
    var self = this;

    return new Promise(function(resolve, reject) {
      models.db.Project.findAll({}).then(function(projects) {
        self.data.projects = projects;

        models.db.DataProvider.findAll({}).then(function(dataProviders){
          self.data.dataProviders = dataProviders;

          models.db.DataSeries.findAll({}).then(function(dataSeries) {
            self.data.dataSeries = dataSeries;
            resolve();
          }).catch(function(err) {
            reject(err);
          });

        }).catch(function(err) {
          reject(err);
        });
      }).catch(function(err) {
        reject(err);
      });
    });
  },

  addProject: function(projectObject) {
    var self = this;
    return new Promise(function(resolve, reject){
      models.db.Project.create(projectObject).then(function(project){
        self.data.projects.push(project);
        resolve(Utils.clone(project.dataValues));
      }).catch(function(e) {
        reject(e);
      });
    });
  },

  addDataSeriesSemantic: function(semanticObject) {
    return new Promise(function(resolve, reject){
      models.db.DataSeriesSemantic.create(semanticObject).then(function(semantic){
        //self.data.projects.push(project);
        resolve(Utils.clone(semantic));
      }).catch(function(e) {
        reject(e);
      });
    });
  },

  addDataProvider: function(dataProviderObject) {
    var self = this;
    return new Promise(function(resolve, reject) {
      models.db.DataProvider.create(dataProviderObject).then(function(dataProvider){
        self.data.dataProviders.push(dataProvider);
        resolve(Utils.clone(dataProvider.dataValues));

        //  todo: emit signal

      }).catch(function(err){
        var error = exceptions.DataProviderError("Could not save DataProvider. " + err);
        reject(error);
      });
    });
  },

  getDataProvider: function(restriction) {
    var self = this;
    return new Promise(function(resolve, reject) {
      var dataProvider = self.data.dataProviders.getItemByParam(restriction);
      if (dataProvider){
        resolve(Utils.clone(dataProvider.dataValues));
      }
      else
        reject(new exceptions.DataProviderError("Could not find a data provider: ", restriction));
    });
  },

  listDataProviders: function() {
    var dataProviderObjectList = [];
    for(var index = 0; index < this.data.dataProviders.length; ++index)
      dataProviderObjectList.push(Utils.clone(this.data.dataProviders[index].dataValues));
    return dataProviderObjectList;
  },

  updateDataProvider: function(dataProviderObject) {
    var self = this;
    return new Promise(function(resolve, reject) {
      for(var i = 0; i < self.data.dataProviders.length; ++i) {
        var provider = self.data.dataProviders[i];
        if (provider.id === dataProviderObject.id) {
          provider.updateAttributes({
            name: dataProviderObject.name,
            description: dataProviderObject.description,
            uri: dataProviderObject.uri,
            active: dataProviderObject.active
          }).then(function() {
            self.data.dataProviders[i] = provider;
            resolve(Utils.clone(provider.dataValues));
          }).catch(function(err) {
            reject(new exceptions.DataProviderError("Could not update data provider ", err));
          });
          return;
        }
      }

      reject(new exceptions.DataProviderError("Data provider not found"));
    });
  },

  removeDataProvider: function(dataProviderParam) {
    var self = this;
    return new Promise(function(resolve, reject) {
      var providerToBeRemoved = self.data.dataProviders.removeItem(dataProviderParam);

      if (providerToBeRemoved) {
        providerToBeRemoved.destroy().then(function (status) {
          resolve(status);
        }).catch(function (err) {
          reject(err);
        });
      }
      else
        reject(new exceptions.DataManagerError("DataManager not initialized yet"));
    });
  },

  getDataSerie: function(restriction)
  {
    var self = this;
    return new Promise(function(resolve, reject) {
      var dataSerie = self.data.dataSeries.getItemByParam(restriction);
      if (dataSerie)
        resolve(Utils.clone(dataSerie.dataValues));
      else
        reject(new exceptions.DataSeriesError("Could not find a data provider: ", restriction));
    });
  },

  listDataSeries: function() {
    var dataSeriesList = [];
    for(var index = 0; index < this.data.dataSeries.length; ++index)
      dataSeriesList.push(this.data.dataSeries[index].dataValues);
    return dataSeriesList;
  },

  addDataSerie: function(dataSeriesObject) {
    var self = this;
    return new Promise(function(resolve, reject) {
      models.db.DataSeries.create(dataSeriesObject).then(function(dataSerie){
        self.data.dataSeries.push(dataSerie);
        resolve(Utils.clone(dataSerie.dataValues));
      }).catch(function(err){
       reject(new exceptions.DataProviderError("Could not save DataSeries. " + err));
      });
    });
  },

  updateDataSerie: function(dataSeriesObject) {
    var self = this;
    return new Promise(function(resolve, reject) {
      for(var i = 0; i < self.data.dataSeries.length; ++i) {
        var element = self.data.dataSeries[i];

        if (element.id === dataSeriesObject.id) {
          element.updateAttributes({
            name: dataSeriesObject.name,
            description: dataSeriesObject.description
            //  todo: should update include too?
          }).then(function() {
            resolve(Utils.clone(element.dataValues));
          }).catch(function(err) {
            reject(new exceptions.DataSeriesError("Could not update data series ", err));
          });
          return;
        }
      }

      reject(new exceptions.DataSeriesError("Data series not found. "));
    });
  },

  removeDataSerie: function(dataSeriesId) {
    this.data.dataProviders.removeItem(dataSeriesId);
  }


};

module.exports = DataManager;