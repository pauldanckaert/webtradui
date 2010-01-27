
/**
 * TiWrap is a set of wrapping objects for Titanium that allow running, testing, and
 * debugging in the browser using normal tools/IDEs like Firebug and Aptana.
 * It's a very basic wrapper and the functionality is limited, but it supports
 * the much faster code/test/debug speeds of browser-based development vs.
 * the standard Titanium mobile of code/launch/trace/guess.
 * 
 * @author David Rees
 * @updates Paul Danckaert (pauld@lemur.org)
 */

var TiWrap;

if (window.Titanium) {
	TiWrap = {
		isTitanium: true,
		isGears: false,
		isWebStorage: false,
		isActive: true,
		version: Titanium.version,
		dbApi: "Titanium",
		Platform: Titanium.Platform,
		API: Titanium.API,
		Database: {
			open: function(name) {
				var db = Titanium.Database.open(name);

				var dbWrapper = {
					db: db,

					execSql: function(sql, args) {
						db.execute(sql, args);
					},

					selectSql: function(sql, args, callbackSuccess, callbackFailure) {
						try {
							var rs = db.execute(sql, args);
                        				var result = [];
							var resultIdx = 0;
							while (rs.isValidRow()) {
								var item = { };
								for (var i=0; i<rs.fieldCount; i++) {
									var fieldName = rs.fieldName(i);
									item[fieldName] = rs.fieldByName(fieldName);
								}
								result[resultIdx++] = item;
								rs.next();
							}
                        				callbackSuccess(result); 
						} catch (e) {
							callbackFailure(e);
						}
					}
				};

				return dbWrapper;
			}
		}, 
		TWExtras: {
			showAlert: function(alert_text){
				TiWrap.API.debug("Alert:" + alert_text);
				var alerty = Titanium.UI.createAlertDialog();
				alerty.setTitle(alert_text);
				alerty.show();
			},
			readFileContents: function(filename){
				var fileString;
				
				TiWrap.API.debug("TiWrap readFileContents starting - " + filename);
				
				var file = Titanium.Filesystem.getFile(Titanium.Filesystem.getResourcesDirectory(), filename);
				TiWrap.API.debug("TiWrap readFileContents file url - " + file.toURL());
				
				if (!file.isFile()) {
					TiWrap.TWExtras.fatalError("TiWrap readFileContents not a file",file.toURL());
				}
	
				fileString = file.read(); 
				TiWrap.API.debug('TiWrap readFileContents fileString - ' + fileString);
			}			
		}
	}
}
else if (window.openDatabase) {

	TiWrap = {
		isTitanium: false,
		isGears: false,
		isWebStorage: true,
		isActive: true,
		version: "TW_version",
		dbApi: "HTML5",
		Platform: {
			version: "TW_Platform_version",
			name: "TW_Platform_name",
		},
		API: {
			info: function(msg) {
				// This assumes Firebug or FireBug Lite is installed (which it always is for me)
				if (console) {
					console.log("INFO: " + msg);
				}
			},
			debug: function(msg) {
				// By default debug messages are ignored in web because we can use a real debugger,
				// uncomment to change this
			}
		},
		Database: {
			open: function(name) {
				var db = window.openDatabase(name, "1.0");

				var dbWrapper = {
					db: db,

					execSql: function(sql, args) {
						db.transaction(function (tx) {
							tx.executeSql(sql, args);
						});
					},

					selectSql: function(sql, args, callbackSuccess, callbackFailure) {

						if (!callbackSuccess) 
							callbackSuccess = function(r) { alert("Default SQL Success." + r); };
						
						if (!callbackFailure) 
							callbackFailure = function(e) { alert("Default SQL Failure." + e); };
						
                				db.transaction(function(tx) {
                        				var result = [];
                    					tx.executeSql(sql, args,function(tx, rs) {
                        					for (var i=0; i<rs.rows.length; i++) {
                            						var row = rs.rows.item(i)
									var item = {};
									for (p in row) { item[p] = row[p]; }
									result[i] = item;
                        					}
                        					callbackSuccess(result); 
                    					})
                				}, callbackFailure);
						
					},
				};
				return dbWrapper;
			},
			install: function(filename, name) {
				TiWrap.TWExtras.fatalError("Database.install is not supported by TiWrap (WebStorage does not support importing from file system)");
			}
		},
		TWExtras: {
			showAlert: function(alert_text){
				alert(alert_text);
			},
			readFileContents: function(filename){
				var fileString;
				TiWrap.API.debug("TiWrap readFileContents starting - " + filename);
				$.ajax({
					'async': false,
					'url': filename,
					'success': function(data){
						TiWrap.API.debug('TiWrap readFileContents success');
						fileString = data;
					}
				});
				return fileString;
			}
		}
	}
}
else if (TiWrap_verifyGears()) {

	TiWrap = {
		isTitanium: false,
		isGears: true,
		isWebStorage: false,
		isActive: true,
		version: "TW_version",
		dbApi: "GoogleGears",
		Platform: {
			version: "TW_Platform_version",
			name: "TW_Platform_name"
		},
		API: {
			info: function(msg) {
				// This assumes Firebug or FireBug Lite is installed (which it always is for me)
				if (console) {
					console.log("INFO: " + msg);
				}
			},
			debug: function(msg) {
				// By default debug messages are ignored in web because we can use a real debugger,
				// uncomment to change this
			}
		},
		// Using TiWrap Database requires Gears to be installed, and note the database will be placed in the firefox
		// profile - see http://code.google.com/apis/gears/api_database.html
		Database: {
			open: function(name) {
				var db = google.gears.factory.create('beta.database');
				db.open(name);

				var dbWrapper = {
					db: db,

					execSql: function(sql, args) {
						db.execute(sql, args);
					},

					selectSql: function(sql, args, callbackSuccess, callbackFailure) {
						try {
							var rs = db.execute(sql, args);
                        				var result = [];
							var resultIdx = 0;
							while (rs.isValidRow()) {
								var item = { };
								for (var i=0; i<rs.fieldCount(); i++) {
									var fieldName = rs.fieldName(i);
									item[fieldName] = rs.fieldByName(fieldName);
								}
								result[resultIdx++] = item;
								rs.next();
							}
                        				callbackSuccess(result); 
						} catch (e) {
							callbackFailure(e);
						}
					}
				};

				return dbWrapper;
			},
			install: function(filename, name) {
				TiWrap.TWExtras.fatalError("Database.install is not supported by TiWrap (Gears DB does not support importing from file system)");
			}
		},
		TWExtras: {
			showAlert: function(alert_text){
				alert(alert_text);
			},
			readFileContents: function(filename){
				var fileString;
				TiWrap.API.debug("TiWrap readFileContents starting - " + filename);
				$.ajax({
					'async': false,
					'url': filename,
					'success': function(data){
						TiWrap.API.debug('TiWrap readFileContents success');
						fileString = data;
					}
				});
				return fileString;
			}
		}
	}
} else {
	TiWrap = {
		isTitanium: false,
		isGears: false,
		isWebStorage: false,
		version: "TW_version",
		isActive: false,
		dbApi: "",
		Platform: { },
		API: { },
		Extras: { },
		TWExtras: { }
	}
}

TiWrap.TWExtras.fatalError = function(err, debugText){
	TiWrap.API.debug(err + "-" + debugText);
	TiWrap.TWExtras.showAlert(err)
	throw (err);
}

function TiWrap_verifyGears() {
	if (!window.google || !google.gears) {
		return false;
	}
	return true;
}
