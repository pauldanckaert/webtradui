/**
 * TiWrap is a set of wrapping objects for Titanium that allow running, testing, and
 * debugging in the browser using normal tools/IDEs like Firebug and Aptana.
 * It's a very basic wrapper and the functionality is limited, but it supports
 * the much faster code/test/debug speeds of browser-based development vs.
 * the standard Titanium mobile of code/launch/trace/guess.
 * 
 * @author David Rees
 */

var TiWrap;

if (window.Titanium) {
	TiWrap = {
		isTitanium: true,
		version: Titanium.version,
		Platform: Titanium.Platform,
		API: Titanium.API,
		Database: Titanium.Database,
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
else {

	TiWrap = {
		isTitanium: false,
		version: "TW_version",
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
				TiWrap_verifyGears();
				var db = google.gears.factory.create('beta.database');
				db.open(name);
				return db;
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
}

TiWrap.TWExtras.fatalError = function(err, debugText){
	TiWrap.API.debug(err + "-" + debugText);
	TiWrap.TWExtras.showAlert(err)
	throw (err);
}

function TiWrap_verifyGears() {
	if (!window.google || !google.gears) {
		TiWrap.TWExtras.showAlert("Gears not found");
	}
}
