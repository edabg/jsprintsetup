//
//  jsPrintSetup 
//  	 Global object extending printing features from client-side JavaScript
//
//  Revision: 
//     $Id: jsPrintSetup.js,v 1.23 2015/06/16 05:49:49 mitko Exp $ 
//
//  Copyright(c) 2009 EDA Ltd.
//
// 
const kMODULE_NAME = "jsPrintSetup";
const kMODULE_CONTRACTID = "@edabg.com/jsprintsetup;1";
const kMODULE_CID = Components.ID("{2eda1003-c9ff-434b-8abd-40c1617f85f7}");
const kMODULE_INTERFACE = Components.interfaces.jsPrintSetup;
// Statically defined alternate can b e used Addon Manager or  Extension Manager in FF 3.x
const kMODULE_VERSION = "0.9.5.2"; 

// Measure Units
const kPaperSizeInches = Components.interfaces.nsIPrintSettings.kPaperSizeInches; //Components.interfaces.nsIPrintSettings.kPaperSizeInches;
const kPaperSizeMillimeters = Components.interfaces.nsIPrintSettings.kPaperSizeMillimeters; //Components.interfaces.nsIPrintSettings.kPaperSizeMillimeters;
// Min/Max PaperSizeID
const kMinPaperSizeID = 1;
const kMaxPaperSizeID = 255;

// Permission Constants
const JSPS_ALLOW_ACTION = Components.interfaces.nsIPermissionManager.ALLOW_ACTION;
const JSPS_DENY_ACTION = Components.interfaces.nsIPermissionManager.DENY_ACTION;
const JSPS_UNKNOWN_ACTION = Components.interfaces.nsIPermissionManager.UNKNOWN_ACTION;

// Import XPCOMUtils
Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

function jsPrintSetup() {
	this.DEBUG = false; 
	this.INITOK = false;
	this.OS = null;
	this.JSON = null;
	this.URL = null;
	this.callback = null;
	this.permissions = JSPS_UNKNOWN_ACTION;
	this.permissionsChecked = false;
	this.securityMode = "prompt";  
	this.localFilesEnabled = true;
	this.allowBlockedRequest = true;
	this.stringBundle = null;
	try {
		// Get OS
		// Returns "WINNT" on Windows Vista, XP, 2000, and NT systems;
		// "Linux" on GNU/Linux; and "Darwin" on Mac OS X.
	   this.OS = Components.classes["@mozilla.org/xre/app-info;1"]
	                  .getService(Components.interfaces.nsIXULRuntime).OS;
		this.URL = this.getWindow().content.document.baseURI;
//		this.URL = "http://ala-bala.portokala.com"; // For debug only!
		this.prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
									.getService(Components.interfaces.nsIPrefService)
									.getBranch('extensions.jsprintsetup.');
		this.readPreferences();	                  
		this.prefBranch.addObserver("", this, false);
		this.permissionManager = Components.classes["@mozilla.org/permissionmanager;1"]
						.getService(Components.interfaces.nsIPermissionManager);
	} catch (err) {
		this.error(err);	
	}
	try {
		this.printSettingsInterface = Components.interfaces.nsIPrintSettings;
	
		this.printSettingsService = 
			Components.classes["@mozilla.org/gfx/printsettings-service;1"]
					.getService(Components.interfaces.nsIPrintSettingsService);
	//	this.printSettingsService = 
	//		Components.classes["@mozilla.org/gfx/printsettings-service;1"]
	//			.createInstance(Components.interfaces.nsIPrintSettingsService);
	
		this.printSettings = this.printSettingsService.newPrintSettings;
	//		this.printSettingsService.globalPrintSettings
	//			.QueryInterface(Components.interfaces.nsIPrintSettings);
	
		this.globalPrintSettings = this.printSettingsService.globalPrintSettings;
		this.prefManager = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
		
		this.readPrintersList();                  
		this._setPrinter('');
	
		this.globalPaperSizeUnit = this.printSettingsService.globalPrintSettings.paperSizeUnit;
		this.paperSizeUnit = kPaperSizeMillimeters;

		this.printProgressListener = null; 

		this.INITOK = true; 
	} catch (err) {
		this.error(err);	
	}
//	this._checkPermissions();
//	this.alert(this.URL);
}


jsPrintSetup.prototype = {
	// XPComUtils required properties
	classDescription: kMODULE_NAME,
	classID:          kMODULE_CID,
	contractID:       kMODULE_CONTRACTID,

	// Component Factory object
	_xpcom_factory: {
		createInstance : function (outer, iid) {
/*	DEBUG CODE	
		var ps  = 
				Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
					.getService(Components.interfaces.nsIPromptService);
		if (iid.equals(kMODULE_INTERFACE)) ps.alert(null, "JS Print Setup",'aa:'+kMODULE_INTERFACE);
		else if (iid.equals(Components.interfaces.nsIClassInfo)) ps.alert(null, "JS Print Setup",'aa:'+Components.interfaces.nsIClassInfo);
		else if (iid.equals(Components.interfaces.nsISecurityCheckedComponent)) ps.alert(null, "JS Print Setup",'aa:'+Components.interfaces.nsISecurityCheckedComponent);
		else if (iid.equals(Components.interfaces.nsISupports)) ps.alert(null, "JS Print Setup",'aa:'+Components.interfaces.nsISupports);
		else ps.alert(null, "JS Print Setup",'aa:unknown:'+iid);
*/		
			if (outer !== null)
				throw Components.results.NS_ERROR_NO_AGGREGATION;
			if (!iid.equals(kMODULE_INTERFACE) &&
				!iid.equals(Components.interfaces.nsIClassInfo) && 
				!iid.equals(Components.interfaces.nsISupports) 
	//			&& !iid.equals(Components.interfaces.nsISecurityCheckedComponent)
				) {
				throw Components.results.NS_ERROR_NO_INTERFACE;
			}
			return (new jsPrintSetup()).QueryInterface(iid);
		}
	},
	// Categories to register
	_xpcom_categories: [{
		category: "JavaScript global property",
		entry: "jsPrintSetup",
		value: kMODULE_CONTRACTID,
		service: false
	}],	
// Interface supporting methods	
	// nsISupports
	QueryInterface: XPCOMUtils.generateQI([
		kMODULE_INTERFACE
		, Components.interfaces.nsIClassInfo
		/*, Components.interfaces.nsISecurityCheckedComponent*/
	]), 
/*	
	QueryInterface: function(iid) {
/ *	DEBUG
		if (iid.equals(kMODULE_INTERFACE)) this.alert(kMODULE_INTERFACE);
		else if (iid.equals(Components.interfaces.nsIClassInfo)) this.alert(Components.interfaces.nsIClassInfo);
		else if (iid.equals(Components.interfaces.nsISupports)) this.alert(Components.interfaces.nsISupports);
		else if (iid.equals(Components.interfaces.nsISecurityCheckedComponent)) this.alert(Components.interfaces.nsISecurityCheckedComponent);
		else this.alert('unknown:'+iid);
* /
		if (!iid.equals(kMODULE_INTERFACE) &&
			!iid.equals(Components.interfaces.nsIClassInfo) &&
			!iid.equals(Components.interfaces.nsISupports) 
//			&&	!iid.equals(Components.interfaces.nsISecurityCheckedComponent)
			) {
			throw Components.results.NS_ERROR_NO_INTERFACE;
		}
		return this;
	},
*/		

	// nsIClassInfo
	getInterfaces: function(aCount) {
		var aResult = [
		 	kMODULE_INTERFACE
			, Components.interfaces.nsIClassInfo
//			, Components.interfaces.nsISecurityCheckedComponent
		];
//		this.alert('get interfaces:'+aResult);
		aCount.value = aResult.length;
		return aResult;
	},

	flags: Components.interfaces.nsIClassInfo.DOM_OBJECT, //|Components.interfaces.nsIClassInfo.SINGLETON,

	implementationLanguage: Components.interfaces.nsIProgrammingLanguage.JAVASCRIPT,

	getHelperForLanguage: function(count) { return null; },
  
	// nsISecurityCheckedComponent
	// Implementation of this interface was suggested from Dave Townsend
	// to see http://weblogs.mozillazine.org/weirdal/archives/017211.html
/*	
	canCreateWrapper : function canCreateWrapper(aIID) {
//		this.alert('canCreateWrapper:'+aIID);
		return "AllAccess";
	},
	canCallMethod: function canCallMethod(aIID, methodName) {
//		this.alert('canGetProperty:'+aIID+':'+propertyName);
		return "AllAccess";
	},
	canGetProperty: function canGetProperty(aIID, propertyName) {
//		this.alert('canGetProperty:'+aIID+':'+propertyName);
		return "AllAccess";
/ *		
		switch (propertyName) {
			case "property 1":
			case "property 2":
				return "AllAccess";
		}
		return "NoAccess";
* /		
	},
	canSetProperty: function canSetProperty(aIID, propertyName) {
//		this.alert('canSetProperty:'+aIID+':'+propertyName);
		return "AllAccess";
/ *	
		if (propertyName == "property 1") {
			return "AllAccess";
		}
		return "NoAccess";
* /		
	},
*/	
// <-- Component fundamental methods and properties

// Follow application specific properties and methods
// PD = paperData -> see Windows Paper Sizes http://msdn.microsoft.com/en-us/library/dd319099%28v=vs.85%29.aspx 
// PN = paperName -> Linux(Unix) paperName see http://library.gnome.org/devel/gtk/2.21/gtk-GtkPaperSize.html
// PWG = Printing WorkGroup for Media Standartizied Names ftp://ftp.pwg.org/pub/pwg/candidates/cs-pwgmsn10-20020226-5101.1.pdf
//       Is is almost same as PN, but at now is not used. It is implemented for future use
// Name = Human readable Name
// M = Measure for Width and Heidth can be kPaperSizeInches or kPaperSizeMillimeters 
// W = Width of paper in M   
// H = Height of paper in M   
  paperSizeList : {
      1 : {PD: 1, PN: 'na_letter',   PWG: 'na_letter_8.5x11in',       Name: 'US Letter', W: 8.5 , H: 11, M: kPaperSizeInches}
    , 2 : {PD: 2, PN: 'na_letter',   PWG: 'na_letter_8.5x11in',       Name: 'US Letter Small', W: 8.5 , H: 11, M: kPaperSizeInches} // pdf creator reports paper_data = 119!
    , 3 : {PD: 3, PN: 'ppd_Tabloid', PWG: 'na_ledger_11x17in',        Name: 'US Tabloid', W: 11 , H: 17, M: kPaperSizeInches}
    , 4 : {PD: 4, PN: 'ppd_Ledger',   PWG: '', /*???*/                 Name: 'US Ledger', W: 17 , H: 11, M: kPaperSizeInches}
    , 5 : {PD: 5, PN: 'na_legal',    PWG: 'na_legal_8.5x14in',        Name: 'US Legal', W: 8.5 , H: 14, M: kPaperSizeInches}
    , 6 : {PD: 6, PN: 'na_invoice',  PWG: 'na_invoice_5.5x8.5in',     Name: 'US Statement', W: 5.5 , H: 8.5, M: kPaperSizeInches}   // Half Letter
    , 7 : {PD: 7, PN: 'na_executive',PWG: 'na_executive_7.25x10.5in', Name: 'US Executive', W: 7.25 , H: 10.5, M: kPaperSizeInches}
    , 8 : {PD: 8, PN: 'iso_a3',      PWG: 'iso_a3_297x420mm',         Name: 'A3', W: 297 , H: 420, M: kPaperSizeMillimeters}
    , 9 : {PD: 9, PN: 'iso_a4',      PWG: 'iso_a4_210x297mm',         Name: 'A4', W: 210 , H: 297, M: kPaperSizeMillimeters}
    ,10 : {PD:10, PN: 'iso_a4',      PWG: 'iso_a4_210x297mm',         Name: 'A4 Small', W: 210 , H: 297, M: kPaperSizeMillimeters}
    ,11 : {PD:11, PN: 'iso_a5',      PWG: 'iso_a5_148x210mm',         Name: 'A5', W: 148 , H: 210, M: kPaperSizeMillimeters}
    ,12 : {PD:12, PN: 'jis_b4',      PWG: 'jis_b4_257x364mm',         Name: 'B4 (JIS)', W: 257 , H: 364, M: kPaperSizeMillimeters}
    ,13 : {PD:13, PN: 'jis_b5',      PWG: 'jis_b5_182x257mm',         Name: 'B5 (JIS)', W: 182 , H: 257, M: kPaperSizeMillimeters}
    ,14 : {PD:14, PN: 'om_folio',    PWG: 'om_folio_210x330mm',       Name: 'Folio', W: 210 , H: 330, M: kPaperSizeMillimeters}    // pdf creator FLSA
    ,15 : {PD:15, PN: 'na_quarto',   PWG: 'na_quarto_8.5x10.83in',    Name: 'Quarto', W: 8.5 , H: 10.83, M: kPaperSizeInches}
    ,16 : {PD:16, PN: 'na_10x14',    PWG: 'na_10x14_10x14in',         Name: '10x14 (envelope)', W: 10, H: 14, M: kPaperSizeInches}
    ,17 : {PD:17, PN: 'na_ledger',   PWG: 'na_ledger_11x17in',        Name: '11x17 (envelope)', W: 11, H: 17, M: kPaperSizeInches} // pdf creator Tabloid
    ,18 : {PD:18, PN: 'na_letter',   PWG: 'na_letter_8.5x11in',       Name: 'US Note', W: 8.5 , H: 11, M: kPaperSizeInches} // == letter
    ,19 : {PD:19, PN: 'na_number-9', PWG: 'na_number-9_3.875x8.875in',Name: 'US Envelope #9', W: 3.875, H: 8.875, M: kPaperSizeInches}
    ,20 : {PD:20, PN: 'na_number-10',PWG: 'na_number-10_4.125x9.5in', Name: 'US Envelope #10', W: 4.125, H: 9.5, M: kPaperSizeInches}
    ,21 : {PD:21, PN: 'na_number-11',PWG: 'na_number-11_4.5x10.375in',Name: 'US Envelope #11', W: 4.5, H: 10.375, M: kPaperSizeInches}
    ,22 : {PD:22, PN: 'na_number-12',PWG: 'na_number-12_4.75x11in',   Name: 'US Envelope #12', W: 4.75, H: 11, M: kPaperSizeInches}
    ,23 : {PD:23, PN: 'na_number-14',PWG: 'na_number-14_5x11.5in',    Name: 'US Envelope #14', W: 5, H: 11.5, M: kPaperSizeInches}
    ,24 : {PD:24, PN: 'na_c',        PWG: 'na_c_17x22in',             Name: 'C size sheet', W: 17, H: 22, M: kPaperSizeInches}
    ,25 : {PD:25, PN: 'na_d',        PWG: 'na_d_22x34in',             Name: 'D size sheet', W: 22, H: 34, M: kPaperSizeInches}
    ,26 : {PD:26, PN: 'na_e',        PWG: 'na_e_34x44in',             Name: 'E size sheet', W: 34, H: 44, M: kPaperSizeInches}
    ,27 : {PD:27, PN: 'iso_dl',      PWG: 'iso_dl_110x220mm',         Name: 'Envelope DL', W: 110, H: 220, M: kPaperSizeMillimeters}
    ,28 : {PD:28, PN: 'iso_c5',      PWG: 'iso_c5_162x229mm',         Name: 'Envelope C5', W: 162, H: 229, M: kPaperSizeMillimeters}
    ,29 : {PD:29, PN: 'iso_c3',      PWG: 'iso_c3_324x458mm',         Name: 'Envelope C3', W: 324, H: 458, M: kPaperSizeMillimeters}
    ,30 : {PD:30, PN: 'iso_c4',      PWG: 'iso_c4_229x324mm',         Name: 'Envelope C4', W: 229, H: 324, M: kPaperSizeMillimeters}
    ,31 : {PD:31, PN: 'iso_c6',      PWG: 'iso_c6_114x162mm',         Name: 'Envelope C6', W: 114, H: 162, M: kPaperSizeMillimeters}
    ,32 : {PD:32, PN: 'iso_c6c5',    PWG: 'iso_c6c5_114x229mm',       Name: 'Envelope C65', W: 114, H: 229, M: kPaperSizeMillimeters}
    ,33 : {PD:33, PN: 'iso_b4',      PWG: 'iso_b4_250x353mm',         Name: 'Envelope B4', W: 250, H: 353, M: kPaperSizeMillimeters}
    ,34 : {PD:34, PN: 'iso_b5',      PWG: 'iso_b5_176x250mm',         Name: 'Envelope B5', W: 176, H: 250, M: kPaperSizeMillimeters}
    ,35 : {PD:35, PN: 'iso_b6',      PWG: 'iso_b6_125x176mm',         Name: 'Envelope B6', W: 125, H: 176, M: kPaperSizeMillimeters}
    ,36 : {PD:36, PN: 'om_italian',  PWG: 'om_italian_110x230mm',     Name: 'Italian Envelope', W: 110, H: 230, M: kPaperSizeMillimeters}
    ,37 : {PD:37, PN: 'na_monarch',  PWG: 'na_monarch_3.875x7.5in',   Name: 'US Envelope Monarch', W: 3.875, H: 7.5, M: kPaperSizeInches}
    ,38 : {PD:38, PN: 'na_personal', PWG: 'na_personal_3.625x6.5in',  Name: 'US Personal Envelope', W: 3.625, H: 6.5, M: kPaperSizeInches} // 6 3/4 Envelope
    ,39 : {PD:39, PN: 'na_fanfold-us',PWG:'na_fanfold-us_11x14.875in',Name: 'US Std Fanfold', W: 11, H: 14.875, M: kPaperSizeInches}
    ,40 : {PD:40, PN: 'na_fanfold-eur',PWG:'na_fanfold-eur_8.5x12in', Name: 'German Std Fanfold', W: 8.5, H: 12, M: kPaperSizeInches}
    ,41 : {PD:41, PN: 'na_foolscap', PWG:'na_foolscap_8.5x13in',      Name: 'German Legal Fanfold', W: 8.5, H: 13, M: kPaperSizeInches}
    // 42 = ISO B4? === 33 by paper size
    ,43 : {PD:43, PN: 'jpn_hagaki',  PWG:'jpn_hagaki_100x148mm',      Name: 'Japanese Postcard', W: 100, H: 148, M: kPaperSizeMillimeters}
  },

	Release: function() {
//		this.alert('release');
		this.prefBranch.removeObserver("", this);
		this.prefBranch = null;
		this.permissionManager = null;
		this.printProgressListener = null;
		this.printSettingsInterface = null;
		this.printSettingsService = null;
		this.printSettings = null;
		this.globalPrintSettings = null;
		this.prefManager = null;
		this.printerList = null;
		return true;
	},
// Alert and logging methods
	alert: function(aMsg){
		var promptService = 
			Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
				.getService(Components.interfaces.nsIPromptService);
		promptService.alert(null, "JS Print Setup", aMsg);
		promptService = null;	
	},

	dump: function(aObj){
		var msg = '';
		for (var i in aObj)  
			msg += '\n'+i+':'/*+aObj[i]*/;
		this.alert('Object:'+msg);
	},

	error: function (err) {
		if (typeof(err) == 'object') {
			var msg = '';
			for (var i in err)  
				if (typeof(err[i]) != 'function') 
					msg += '\n'+i+':'+err[i];
			this.alert('Error:'+msg);
		} else 
			this.alert('Error:'+err);
	},

	log: function (aMsg) {
	  var consoleService = 
	    Components.classes["@mozilla.org/consoleservice;1"].
	               getService(Components.interfaces.nsIConsoleService);
	  consoleService.logStringMessage(aMsg);
	  consoleService = null;
	},

// Common private methods
	gettext: function (msg) {
		try {
			if (!this.stringBundle) {
				this.stringBundle = Components.classes["@mozilla.org/intl/stringbundle;1"]
					.getService(Components.interfaces.nsIStringBundleService)
					.createBundle("chrome://jsprintsetup/locale/jsprintsetup.properties");						
			}
			return this.stringBundle.GetStringFromName(msg);
		} catch (err) {
			if (this.DEBUG) this.error(err);
			return msg;	
		}
	},
	
	getJSONObj: function() {
		if (!this.JSON) 
			this.JSON = Components.classes["@mozilla.org/dom/json;1"].createInstance(Components.interfaces.nsIJSON);
	},
  	
	getWindow: function () {
		var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
									.getService(Components.interfaces.nsIWindowMediator);
		return wm.getMostRecentWindow('navigator:browser');
	},
	
  getWebBrowserPrint: function (aWindow)
  {
    var contentWindow = aWindow || this.getWindow().content;
//		this.alert(contentWindow.frames.length);
//		if (contentWindow.frames.length)
//			contentWindow = contentWindow.frames[0]; 
    return contentWindow.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                        .getInterface(Components.interfaces.nsIWebBrowserPrint);
  },
  
/*
  getWebBrowserPrint: function ()
  {
//    var contentWindow = aWindow || window.content;
		var contentWindow = this.getWindow().content;
    	return contentWindow.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                        .getInterface(Components.interfaces.nsIWebBrowserPrint);
  },
*/

// Preferences support
	observe : function (aSubject, aTopic, aData) {
		if (aTopic != "nsPref:changed") return;
//		if (this.DEBUG) this.alert(aTopic+" -> "+aData); 
/*		
		switch (aData) {
			case "security_mode" :
				break;
			case "localfiles_enabled" :
				break;
			case "allow_blocked_request" :
				break;
		}
*/		
		this.readPreferences();
	},
	
	getVersion : function () {
		return kMODULE_VERSION;
	},
	
	readPreferences : function () {
		try {
//			if (this.prefBranch.prefHasUserValue('security_mode'))
				this.securityMode = this.prefBranch.getCharPref('security_mode');  
//			if (this.prefBranch.prefHasUserValue('localfiles_enabled'))
				this.localFilesEnabled = this.prefBranch.getBoolPref('localfiles_enabled');
//			if (this.prefBranch.prefHasUserValue('allow_blocked_request'))
				this.allowBlockedRequest = this.prefBranch.getBoolPref('allow_blocked_request');
		} catch (err) {
			this.error(err);	
		}
	}, 

// Callback
	setCallback : function (callback) {
		this.callback = callback;
	}, 		
// Permission support methods
	isLocalFileURL : function (URL) {
		return URL.match(/^file:\/\/\/./);
	},
	
	checkURLPermissions : function (URL) {
		var perm = JSPS_UNKNOWN_ACTION;
		try {
			if (this.isLocalFileURL(URL)) {
				// local file
				perm = this.localFilesEnabled?JSPS_ALLOW_ACTION:JSPS_DENY_ACTION; 
			} else {
				var ioService = Components.classes["@mozilla.org/network/io-service;1"]
					.getService(Components.interfaces.nsIIOService);
				var host = URL.replace(/^\s*([-\w]*:\/+)?/, ""); // trim any leading space and scheme
				host = (host.charAt(0) == ".") ? host.substring(1,host.length) : host;
				var URI = ioService.newURI("http://"+host, null, null);			
				switch (this.permissionManager.testPermission(URI, "jsPrintSetup")) {
					case this.permissionManager.ALLOW_ACTION :
						perm = JSPS_ALLOW_ACTION;
						break;
					case this.permissionManager.DENY_ACTION :
						perm = JSPS_DENY_ACTION;
						break;
					default :	
						perm = JSPS_UNKNOWN_ACTION;
				}
			}
		} catch (err) {
			this.error(err);	
		}
		return perm;
	},
	
	 getPermissions : function () {
		if (this.securityMode == "all") return JSPS_ALLOW_ACTION;
		return this.checkURLPermissions(this.URL);
	},
	
	_checkPermissions : function () {
		if (this.securityMode == "all") return true;
		this.permissions = this.checkURLPermissions(this.URL);
//		this.alert(this.permissions+':'+JSPS_ALLOW_ACTION);
		if ((this.permissions == JSPS_UNKNOWN_ACTION) && (this.securityMode != "allowed")) 
			this.askUserPermissions();
		var permResult = (this.permissions == JSPS_ALLOW_ACTION);
		if (this.callback && this.callback.permissionsCheck) {
			try {
				this.callback.permissionsCheck(permResult);
			} catch (err) {
			}	
		}	
		return permResult; 
	},
	
	permissionsAskCallback : function(allowed) {
		if (this.callback && this.callback.permissionsAsk) {
			try {
				this.callback.permissionsAsk(allowed);
			} catch (err) {
			}
		}
	},

	askUserPermissions : function (callback) {
		if (callback)
			this.setCallback(callback);
		var permissions = this.checkURLPermissions(this.URL);
		// If ask for permissions is enabled Do asking
		if ((permissions == JSPS_UNKNOWN_ACTION) || (permissions == JSPS_DENY_ACTION) && this.allowBlockedRequest)
			this._askUserPermissions();
	},
		
	_askUserPermissions : function () {
		try {
			var win = this.getWindow();
			var nb = win.getNotificationBox(win.content);
			var n = nb.getNotificationWithValue('jsprintsetup-askpermission');
			if (n) {
				// already open
			} else {
				var self = this;						
				var buttons = [
					{
						label: this.gettext('Allow'), 
						accessKey: this.gettext('AllowKey'),   
						//popup: "jsprintsetupNotificationOptions",//@todo the questions in this menu... Need an overlay? or can be built on demand?
						callback: function (aNotifyObj, aButton) {
							self.setPermission(self.URL, 'allow');
							self.permissionsAskCallback(true);
							return false;
						}
					},
					{
						label: this.gettext('Block'), //@todo use locale property
						accessKey: this.gettext('BlockKey'),   //@todo use locale property
						//popup: "jsprintsetupNotificationOptions",//@todo the questions in this menu... Need an overlay? or can be built on demand?
						callback: function (aNotifyObj, aButton) {
							self.setPermission(self.URL, 'block');
							self.permissionsAskCallback(false);
							return false;
						}
					},
					{
						label: this.gettext('Permissions'), //@todo use locale property
						accessKey: this.gettext('PermissionsKey'),   //@todo use locale property
						//popup: "jsprintsetupNotificationOptions",//@todo the questions in this menu... Need an overlay? or can be built on demand?
						callback: function(aNotifyObj, aButton) {
							self.openPermissionManager();
							return true;
						}
					}
				];
				n = nb.appendNotification(
					//@todo use locale property
					this.gettext('ReqPermissonsText'), 
					'jsprintsetup-askpermission',
					'chrome://browser/skin/Info.png',
					nb.PRIORITY_WARNING_MEDIUM,
					buttons
				);
				this._notification_closed = function (e) {
					if ((e.originalTarget.tagName == 'xul:toolbarbutton') && e.originalTarget.className.match(/messageCloseButton/)) {
						try {
							if (self._notification_closed && typeof(self._notification_closed) != 'undefined') { 
								nb.removeEventListener('command', self._notification_closed, false);
								self._notification_closed = null;
							}	
						} catch (err) {
							if (this.DEBUG) this.error(err);
						}
						self.permissionsAskCallback(false);
					}
				};
				// catchup close button
				nb.addEventListener('command', this._notification_closed, false);
			}	
		} catch (err) {
			if (this.DEBUG) this.error(err);
		}
	},
	
	closeNotification: function () {
		try {
			var win = this.getWindow();
			var nb = win.getNotificationBox(win.content);
			var n = nb.getNotificationWithValue('jsprintsetup-askpermission');
			if (this._notification_closed && typeof(this._notification_closed) != 'undefined') {
				nb.removeEventListener('command', this._notification_closed, false);
				this._notification_closed = null;
			}	
			if (n) {
				n.close();
			}
		} catch (err) {
			if (this.DEBUG) this.error(err);
		}
	},

	openPermissionManager: function() {
//http://mxr.mozilla.org/firefox/source/browser/base/content/browser.js#549
/*	
		var params = { blockVisible     : true,
							sessionVisible   : false,
							allowVisible     : true,
							prefilledHost    : "",
							permissionType   : "jsPrintSetup",
							manageCapability : Components.interfaces.nsIPermissionManager.DENY_ACTION,
							windowTitle      : "jsPrintSetup",
							introText        : "jsPrintSetup Permissions" 
		};
*/		
		var params = { blockVisible   : true,
							sessionVisible : false,
							allowVisible   : true,
							prefilledHost  : this.URL,
							permissionType : "jsPrintSetup", //"popup",
							windowTitle    : "jsPrintSetup",
							introText      : "jsPrintSetup "+this.gettext("Permissions") 
		};		
		var win = this.getWindow();
		win.openDialog("chrome://browser/content/preferences/permissions.xul",
								"_blank", "resizable,dialog=no,centerscreen", params);
	},
	
	setPermission : function (URL, act) {
		var perm = (act == "block")?this.permissionManager.DENY_ACTION:this.permissionManager.ALLOW_ACTION;
		try {
			if (this.isLocalFileURL(URL)) {
				this.localFilesEnabled = (perm == this.permissionManager.ALLOW_ACTION); 
				this.prefBranch.setBoolPref('localfiles_enabled', this.localFilesEnabled);
			} else {
				var ioService = Components.classes["@mozilla.org/network/io-service;1"]
					.getService(Components.interfaces.nsIIOService);
				var host = URL.replace(/^\s*([-\w]*:\/+)?/, ""); // trim any leading space and scheme
				host = (host.charAt(0) == ".") ? host.substring(1,host.length) : host;
				var URI = ioService.newURI("http://"+host, null, null);			
				this.permissionManager.add(URI, "jsPrintSetup", perm);
			}	
		} catch (err) {
			if (this.DEBUG) this.error(err);
		}
	},
	
// Common converting private methods 
	adjustValue : function (value, unitFrom, unitTo) {
		if (unitFrom != unitTo) {
			// Different Paper Size Units 
			if (unitTo == kPaperSizeInches)
				// value is in mm -> convert to inches
				return value / 25.4;
			else
				// value is in inches -> convert to mm
				return value * 25.4;
		} else
			return value;
	},
	
	// gets printer setting value and adjust it depending of units
	getValue : function (value) {
		// Here must be this.printSettings.paperSizeUnit, but actualy don't work properly
		// to work well we are using this.globalPrintSettings.paperSizeUnit
		return this.adjustValue(value, this.globalPrintSettings.paperSizeUnit, this.paperSizeUnit);
	},

	// sets printer setting value and adjust it depending of units
	setValue : function (value) {
		// Here must be this.printSettings.paperSizeUnit, but actualy don't work properly
		// to work well we are using this.globalPrintSettings.paperSizeUnit
		return this.adjustValue(value, this.paperSizeUnit, this.globalPrintSettings.paperSizeUnit);
	},

	// gets global printer setting value and adjust it depending of units
	getGlobalValue : function (value) {
		return this.adjustValue(value, this.globalPrintSettings.paperSizeUnit, this.paperSizeUnit);
	},

	// sets global printer setting value and adjust it depending of units
	setGlobalValue : function (value) {
		return this.adjustValue(value, this.paperSizeUnit, this.globalPrintSettings.paperSizeUnit);
	},

	// converts string to boolean
	toBool: function (value){
		return ((value == "true") || (value == "1")? true:false);
	},

	// convert scaling from percent to actual unit using from mozilla and reverse
	scalingConvert: function (scaling){
		if (scaling < 10.0) {
			scaling = 10.0;
		}
		if (scaling > 500.0) {
			scaling = 500.0;
		}
		scaling /= 100.0;
		
		return scaling;
	},
	scalingConvertR: function (scaling){
		return scaling*100;
	},
	
	// jsPrintSetup paperSizeUnit
	getPaperSizeUnit : function () {
		return this.paperSizeUnit;
	}, 
	setPaperSizeUnit : function (aPaperSizeUnit) {
		this.paperSizeUnit = aPaperSizeUnit;
	},
	
	// Papre Size Manipulation
	getPaperSizeList: function () {
		this.getJSONObj();
		return this.JSON.encode(this.paperSizeList);
	},
	definePaperSize: function (jspid, pd, pn,  pwg, name, w, h, m) {
		if (jspid < kMinPaperSizeID) {
			this.alert('error jspid='+jspid+' cant be smaller than '+kMinPaperSizeID);
			return;
		} else if (jspid > kMaxPaperSizeID) {
			this.alert('error jspid='+jspid+' cant be greater than '+kMaxPaperSizeID);
			return;
		}
		this.paperSizeList[jspid] = {PD:pd, PN: pn,  PWG:pwg, Name: name, W: w, H: h, M: m}; 
	},
	undefinePaperSize: function (jspid) {
		if (typeof(this.paperSizeList[jspid]) != 'undefined')
			delete this.paperSizeList[jspid]; 
	},
	getPaperSizeDataByID: function (jspid) {
		var pd = null;
		if (typeof(this.paperSizeList[jspid]) != 'undefined')
			pd = this.paperSizeList[jspid];  
		this.getJSONObj();
		return this.JSON.encode(pd);
	},
	// Find Paper Data definition by paperData (Windows implementation)
	_getPaperSizeDataByPD: function (pd) {
		var res = null;
		for(var jspid in this.paperSizeList)
			if (this.paperSizeList[jspid].PD == pd) {
				res = this.paperSizeList[jspid]; 
			}
		return res;          
	},
	// Find Paper Data definition by paperName (Linux GTK implementation)
	_getPaperSizeDataByPN: function (pn) {
		var res = null;
		for(var jspid in this.paperSizeList)
			if (this.paperSizeList[jspid].PN == pn) {
				res = this.paperSizeList[jspid]; 
			}
		return res;          
	},
	// Match Paper Size Data depending of current printSettings and OS
	_getPapreSizeData: function() {
		var res = null;
		if (this.OS.toLowerCase() == 'winnt')
			res = this._getPaperSizeDataByPD(this.printSettings.paperData);
		else { // (this.OS.toLowerCase() == 'linux')
			// All other OS check paperName
			res = this._getPaperSizeDataByPN(this.printSettings.paperName);
		}
		return res;
	},	   
	getPaperSizeData: function () {
		var pd = this._getPapreSizeData();
		this.getJSONObj();
		return this.JSON.encode(pd);
	},
	getPaperMeasure: function () {
		w = h = 0;
		var pd = this._getPapreSizeData();
		if (pd) {
			w = this.adjustValue(pd.W, pd.M, this.paperSizeUnit); 
			h = this.adjustValue(pd.H, pd.M, this.paperSizeUnit); 
		} else {
			w = this.adjustValue(this.printSettings.paperHeight, this.printSettings.paperSizeUnit, this.paperSizeUnit); 
			h = this.adjustValue(this.printSettings.paperWidth, this.printSettings.paperSizeUnit, this.paperSizeUnit); 
		} 
		this.getJSONObj();
		var res = this.JSON.encode({PD: pd, W: w, H: h});
		return res;
	},
	setPaperSizeData: function (jspid) {
		if (typeof(this.paperSizeList[jspid]) == 'undefined')
			return false;
		this.printSettings.paperName = this.paperSizeList[jspid].PN;		  
		this.printSettings.paperData = this.paperSizeList[jspid].PD;		  
		this.printSettings.paperWidth = this.paperSizeList[jspid].W;		  
		this.printSettings.paperHeight = this.paperSizeList[jspid].H;		  
		this.printSettings.paperSizeUnit = this.paperSizeList[jspid].M;
		return true;		  
	},

	// sets printer name and read its settings, if
	_setPrinter : function(printerName) {
		// Check for printer exist in list is removed instead of this error are captured!
/*	
		if (printerName) {
			// check if printer exist
			for (var i = 0, p_exist = false; (i < this.printerList.length) && !p_exist; i++)
				if (this.printerList[i] == printerName) p_exist = 1;
			if (!p_exist) {
				this.alert('Error: Printer \''+printerName+'\' doesn\'t exist!');
				return;
			}
		}
*/		
		try {
			// On Mac OS this.printSettingsService.defaultPrinterName produce Error!
			try {
				this.printerName = (printerName? printerName:this.printSettingsService.defaultPrinterName);
			} catch (err) {
				if (printerName)
					this.printerName = printerName;
			}
			// On Linux Set Environment Variable PRINTER for fix FF behaviour on GNOME
			if (this.OS && (this.OS.toLowerCase() == 'linux')) {
				var env;
				try {
					env = Components.classes['@mozilla.org/process/environment;1']
						.getService(Components.interfaces.nsIEnvironment);
					env.set('PRINTER', this.printerName.replace(/^CUPS[/]/ig, '')); // Remove CUPS prefix if exists
				} catch (err) {
					if (this.DEBUG) this.error(err);
				}					
				env = null;
			} 
			// In case of error above
			if (this.printerName) {
				this.printSettings.printerName = this.printerName;
				// This is part from mozilla toolkit printUtils.js
				// First get any defaults from the printer 		
				this.printSettingsService.initPrintSettingsFromPrinter(this.printSettings.printerName, this.printSettings);
			}
			// now augment them with any values from last time
			this.printSettingsService.initPrintSettingsFromPrefs(this.printSettings, true, this.printSettingsInterface.kInitSaveAll);
	
		/*	if (this.printSettingsService.defaultPrinterName != this.printerName)
				this.printSettingsService.defaultPrinterName = this.printerName;*/
		} catch (err) {
			if (this.DEBUG) this.error(err);
		}		
	}, 	

	setPrinter: function(printerName){
		if (!this._checkPermissions()) return;
		this._setPrinter(printerName);
	},
	
	// get current printer name 
	getPrinter: function(){
		if (!this._checkPermissions()) return null;
		return this.printerName;
	},
	
	readPrintersList: function() {
		this.printerList = new Array();
		var printerEnumerator;
		try {
			// Printer Enumerator in Mac OS is not implemented!
			printerEnumerator =	Components.classes["@mozilla.org/gfx/printerenumerator;1"];
			if(printerEnumerator) { 
				printerEnumerator = printerEnumerator.getService(Components.interfaces.nsIPrinterEnumerator);
				if (printerEnumerator)
					printerEnumerator = printerEnumerator.printerNameList;  
			}
			if (printerEnumerator) {
				var i = 0;
				while(printerEnumerator.hasMore())
					this.printerList[i++] = printerEnumerator.getNext();
			} else {
				// In case of Mac OS this.printSettingsService.defaultPrinterName produce error!
				try {
					this.printerList[0] = this.printSettingsService.defaultPrinterName;
				} catch (err) {
					try {
						if (this.printSettings.printerName)
							this.printerList[0] = this.printSettings.printerName;
					} catch (err) {
					} 	
				}	
			}	
		} catch (err) {
			if (this.DEBUG) this.error(err);
		}
		printerEnumerator = null;		
/*
		var printerEnumerator =
			Components.classes["@mozilla.org/gfx/printerenumerator;1"]
				.getService(Components.interfaces.nsIPrinterEnumerator)
				.printerNameList;
		this.printerList = new Array();
		var i = 0;
		while(printerEnumerator.hasMore())
			this.printerList[i++] = printerEnumerator.getNext();
		return this.printerList;
*/			
	},

	// get list of available printers
	getPrintersList: function(){
		if (!this._checkPermissions()) 
			return null;
		else {
			this.readPrintersList();
			return this.printerList;
		}
	},

	//set current printer options
	setOption: function(option,value){
		if (!this._checkPermissions()) return ;
		// See interface description: http://lxr.mozilla.org/mozilla-central/source/widget/nsIPrintSettings.idl
		try {
			switch(option){
				case 'orientation':
					this.printSettings.orientation = value;
					break;
				// Margins in inches 
				// The margins define the positioning of the content on the page.
				// They're treated as an offset from the "unwriteable margin"
				// (described below).
				case 'marginTop':
					this.printSettings.marginTop = this.adjustValue(value, this.paperSizeUnit, kPaperSizeInches);
					break;
				case 'marginLeft':
					this.printSettings.marginLeft = this.adjustValue(value, this.paperSizeUnit, kPaperSizeInches);
					break;
				case 'marginRight':
					this.printSettings.marginRight = this.adjustValue(value, this.paperSizeUnit, kPaperSizeInches);
					break;
				case 'marginBottom':
					this.printSettings.marginBottom = this.adjustValue(value, this.paperSizeUnit, kPaperSizeInches);
					break;
				// The edge measurements (in inches) define the positioning of the headers
				// and footers on the page. They're measured as an offset from
				// the "unwriteable margin" (described below).
				case 'edgeTop':
					this.printSettings.edgeTop = this.adjustValue(value, this.paperSizeUnit, kPaperSizeInches);
					break;
				case 'edgeLeft':
					this.printSettings.edgeLeft = this.adjustValue(value, this.paperSizeUnit, kPaperSizeInches);
					break;
				case 'edgeBottom':
					this.printSettings.edgeBottom = this.adjustValue(value, this.paperSizeUnit, kPaperSizeInches);
					break;
				case 'edgeRight':
					this.printSettings.edgeRight = this.adjustValue(value, this.paperSizeUnit, kPaperSizeInches);
					break;
 				// The unwriteable margin (in inches) defines the printable region of the paper, creating
				// an invisible border from which the edge and margin attributes are measured.
				case 'unwriteableMarginTop':
					this.printSettings.unwriteableMarginTop = this.adjustValue(value, this.paperSizeUnit, kPaperSizeInches);
					break;
				case 'unwriteableMarginLeft':
					this.printSettings.unwriteableMarginLeft = this.adjustValue(value, this.paperSizeUnit, kPaperSizeInches);
					break;
				case 'unwriteableMarginBottom':
					this.printSettings.unwriteableMarginBottom = this.adjustValue(value, this.paperSizeUnit, kPaperSizeInches);
					break;
				case 'unwriteableMarginRight':
					this.printSettings.unwriteableMarginRight = this.adjustValue(value, this.paperSizeUnit, kPaperSizeInches);
					break;
				// Header and footer
				case 'headerStrCenter':
					this.printSettings.headerStrCenter = value;
					break;
				case 'headerStrLeft':
					this.printSettings.headerStrLeft = value;
					break;
				case 'headerStrRight':
					this.printSettings.headerStrRight = value;
					break;
				case 'footerStrCenter':
					this.printSettings.footerStrCenter = value;
					break;
				case 'footerStrLeft':
					this.printSettings.footerStrLeft = value;
					break;
				case 'footerStrRight':
					this.printSettings.footerStrRight = value;
					break;
				// Other	
				case 'scaling':
					this.printSettings.scaling = this.scalingConvert(value);
					break;
				case 'shrinkToFit':
					this.printSettings.shrinkToFit = this.toBool(value);
					break;
				case 'numCopies':
					this.printSettings.numCopies = value;
					break;				
				case 'outputFormat':
					this.printSettings.outputFormat = value;				
					break;				
				case 'paperName':
					this.printSettings.paperName = value;				
					break;				
				case 'paperData':
					this.printSettings.paperData = value;				
					break;				
				case 'paperSizeType':
					this.printSettings.paperSizeType = value;				
					break;
				case 'paperSizeUnit':
					this.alert("The property paperSizeUnit is readonly!");
	//				this.printSettings.paperSizeUnit = value;				
					break;			
				case 'paperHeight':
					this.printSettings.paperHeight = this.setValue(value);				
					break;				
				case 'paperWidth':
					this.printSettings.paperWidth = this.setValue(value);				
					break;
				case 'printRange':
					this.printSettings.printRange = value;				
					break;
				case 'startPageRange':
					this.printSettings.startPageRange = value;				
					break;
				case 'endPageRange':
					this.printSettings.endPageRange = value;				
					break;
				case 'printSilent':
					this.printSettings.printSilent = this.toBool(value);				
					break;									
				case 'showPrintProgress':
					this.printSettings.showPrintProgress = this.toBool(value);				
					break;
				case 'printBGColors' :
					this.printSettings.printBGColors = this.toBool(value);				
					break;										
				case 'printBGImages' :
					this.printSettings.printBGImages = this.toBool(value);				
					break;										
				case 'duplex' :
					this.printSettings.duplex = value;				
					break;										
				case 'resolution' :
					this.printSettings.resolution = value;				
					break;										
				case 'title':
					this.printSettings.title = value;
					break;
				case 'toFileName':
					this.printSettings.toFileName = value;
					break;
				default :
					this.alert('Not supported option:'+option);										
			}
		} catch (err) {
			if (this.DEBUG) this.error(err);
		}		 
	},

	// set global print options
	setGlobalOption: function(option,value){
		if (!this._checkPermissions()) return;
		try {
			switch(option){
				case 'orientation':
					this.globalPrintSettings.orientation = value;
					break;
				case 'marginTop':
					this.globalPrintSettings.marginTop = this.adjustValue(value, this.paperSizeUnit, kPaperSizeInches);
					break;
				case 'marginLeft':
					this.globalPrintSettings.marginLeft = this.adjustValue(value, this.paperSizeUnit, kPaperSizeInches);
					break;
				case 'marginRight':
					this.globalPrintSettings.marginRight = this.adjustValue(value, this.paperSizeUnit, kPaperSizeInches);
					break;
				case 'marginBottom':
					this.globalPrintSettings.marginBottom = this.adjustValue(value, this.paperSizeUnit, kPaperSizeInches);
					break;
				case 'edgeTop':
					this.globalPrintSettings.edgeTop = this.adjustValue(value, this.paperSizeUnit, kPaperSizeInches);
					break;
				case 'edgeLeft':
					this.globalPrintSettings.edgeLeft = this.adjustValue(value, this.paperSizeUnit, kPaperSizeInches);
					break;
				case 'edgeBottom':
					this.globalPrintSettings.edgeBottom = this.adjustValue(value, this.paperSizeUnit, kPaperSizeInches);
					break;
				case 'edgeRight':
					this.globalPrintSettings.edgeRight = this.adjustValue(value, this.paperSizeUnit, kPaperSizeInches);
					break;
				case 'unwriteableMarginTop':
					this.globalPrintSettings.unwriteableMarginTop = this.adjustValue(value, this.paperSizeUnit, kPaperSizeInches);
					break;
				case 'unwriteableMarginLeft':
					this.globalPrintSettings.unwriteableMarginLeft = this.adjustValue(value, this.paperSizeUnit, kPaperSizeInches);
					break;
				case 'unwriteableMarginBottom':
					this.globalPrintSettings.unwriteableMarginBottom = this.adjustValue(value, this.paperSizeUnit, kPaperSizeInches);
					break;
				case 'unwriteableMarginRight':
					this.globalPrintSettings.unwriteableMarginRight = this.adjustValue(value, this.paperSizeUnit, kPaperSizeInches);
					break;
				case 'headerStrCenter':
					this.globalPrintSettings.headerStrCenter = value;
					break;
				case 'headerStrLeft':
					this.globalPrintSettings.headerStrLeft = value;
					break;
				case 'headerStrRight':
					this.globalPrintSettings.headerStrRight = value;
					break;
				case 'footerStrCenter':
					this.globalPrintSettings.footerStrCenter = value;
					break;
				case 'footerStrLeft':
					this.globalPrintSettings.footerStrLeft = value;
					break;
				case 'footerStrRight':
					this.globalPrintSettings.footerStrRight = value;
					break;
				case 'shrinkToFit':
					this.globalPrintSettings.shrinkToFit = this.toBool(value);
					break;
				case 'scaling':
					this.globalPrintSettings.scaling = this.scalingConvert(value);
					break;
				case 'numCopies':
					this.globalPrintSettings.numCopies = value;
					break;				
				case 'outputFormat':
					this.globalPrintSettings.outputFormat = value;				
					break;				
				case 'paperName':
					this.globalPrintSettings.paperName = value;				
					break;				
				case 'paperData':
					this.globalPrintSettings.paperData = value;				
					break;				
				case 'paperSizeType':
					this.globalPrintSettings.paperSizeType = value;				
					break;
				case 'paperSizeUnit':
					this.alert("The Global property paperSizeUnit is readonly!");			
	//				this.globalPrintSettings.paperSizeUnit = value;				
					break;				
				case 'paperHeight':
					this.globalPrintSettings.paperHeight = this.setGlobalValue(value);				
					break;				
				case 'paperWidth':
					this.globalPrintSettings.paperWidth = this.setGlobalValue(value);				
					break;								
				case 'printRange':
					this.globalPrintSettings.printRange = value;				
					break;
				case 'startPageRange':
					this.globalPrintSettings.startPageRange = value;				
					break;
				case 'endPageRange':
					this.globalPrintSettings.endPageRange = value;				
					break;
				case 'printSilent':
					this.globalPrintSettings.printSilent = this.toBool(value);				
					break;									
				case 'showPrintProgress':
					this.globalPrintSettings.showPrintProgress = this.toBool(value);				
					break;									
				case 'printBGColors' :
					this.globalPrintSettings.printBGColors = this.toBool(value);				
					break;										
				case 'printBGImages' :
					this.globalPrintSettings.printBGImages = this.toBool(value);				
					break;										
				case 'resolution' :
					this.globalPrintSettings.resolution = value;				
					break;										
				case 'duplex' :
					this.globalPrintSettings.duplex = value;				
					break;										
				case 'title':
					this.globalPrintSettings.title = value;
					break;
				case 'toFileName':
					this.globalPrintSettings.toFileName = value;
					break;
				case 'DEBUG':
					this.DEBUG = this.toBool(value);				
					break;									
				default :
					this.alert('Not supported option:'+option);										
			}
		} catch (err) {
			if (this.DEBUG) this.error(err);
		}		 
	},	

	// get current printer options
 	getOption: function(option){
		if (!this._checkPermissions()) return null;
		this.prefStatus = null;
		try {	
			switch(option){
				case 'orientation':
					this.prefStatus = this.printSettings.orientation;
					break;
				case 'marginTop':
					this.prefStatus = this.adjustValue(this.printSettings.marginTop, kPaperSizeInches, this.paperSizeUnit);
					break;
				case 'marginLeft':
					this.prefStatus = this.adjustValue(this.printSettings.marginLeft, kPaperSizeInches, this.paperSizeUnit);
					break;
				case 'marginRight':
					this.prefStatus = this.adjustValue(this.printSettings.marginRight, kPaperSizeInches, this.paperSizeUnit);
					break;
				case 'marginBottom':
					this.prefStatus = this.adjustValue(this.printSettings.marginBottom, kPaperSizeInches, this.paperSizeUnit);
					break;
				case 'edgeTop':
					this.prefStatus = this.adjustValue(this.printSettings.edgeTop, kPaperSizeInches, this.paperSizeUnit);
					break;
				case 'edgeLeft':
					this.prefStatus = this.adjustValue(this.printSettings.edgeLeft, kPaperSizeInches, this.paperSizeUnit);
					break;
				case 'edgeBottom':
					this.prefStatus = this.adjustValue(this.printSettings.edgeBottom, kPaperSizeInches, this.paperSizeUnit);
					break;
				case 'edgeRight':
					this.prefStatus = this.adjustValue(this.printSettings.edgeRight, kPaperSizeInches, this.paperSizeUnit);
					break;
				case 'unwriteableMarginTop':
					this.prefStatus = this.adjustValue(this.printSettings.unwriteableMarginTop, kPaperSizeInches, this.paperSizeUnit);
					break;
				case 'unwriteableMarginLeft':
					this.prefStatus = this.adjustValue(this.printSettings.unwriteableMarginLeft, kPaperSizeInches, this.paperSizeUnit);
					break;
				case 'unwriteableMarginBottom':
					this.prefStatus = this.adjustValue(this.printSettings.unwriteableMarginBottom, kPaperSizeInches, this.paperSizeUnit);
					break;
				case 'unwriteableMarginRight':
					this.prefStatus = this.adjustValue(this.printSettings.unwriteableMarginRight, kPaperSizeInches, this.paperSizeUnit);
					break;
				case 'headerStrCenter':
					this.prefStatus = this.printSettings.headerStrCenter;
					break;
				case 'headerStrLeft':
					this.prefStatus = this.printSettings.headerStrLeft;
					break;
				case 'headerStrRight':
					this.prefStatus = this.printSettings.headerStrRight;
					break;
				case 'footerStrCenter':
					this.prefStatus = this.printSettings.footerStrCenter;
					break;
				case 'footerStrLeft':
					this.prefStatus = this.printSettings.footerStrLeft;
					break;
				case 'footerStrRight':
					this.prefStatus = this.printSettings.footerStrRight;
					break;
				case 'scaling':
					this.prefStatus = this.scalingConvertR(this.printSettings.scaling);				
					break;			
				case 'shrinkToFit':
					this.prefStatus = this.printSettings.shrinkToFit;
					break;
				case 'numCopies':
					this.prefStatus = this.printSettings.numCopies;				
					break;				
				case 'outputFormat':
					this.prefStatus = this.printSettings.outputFormat;				
					break;				
				case 'paperName':
					this.prefStatus = this.printSettings.paperName;				
					break;				
				case 'paperData':
					this.prefStatus = this.printSettings.paperData;				
					break;				
				case 'paperSizeType':
					this.prefStatus = this.printSettings.paperSizeType;				
					break;
				case 'paperSizeUnit':
					this.prefStatus = this.printSettings.paperSizeUnit;				
					break;				
				case 'paperHeight':
					this.prefStatus = this.getValue(this.printSettings.paperHeight);				
					break;				
				case 'paperWidth':
					this.prefStatus = this.getValue(this.printSettings.paperWidth);				
					break;												
				case 'pinterName': // for my bug compatibility
				case 'printerName':
					this.prefStatus = this.printSettings.printerName;
					break;
				case 'printRange':
					this.prefStatus = this.printSettings.printRange;				
					break;
				case 'startPageRange':
					this.prefStatus = this.printSettings.startPageRange;				
					break;
				case 'endPageRange':
					this.prefStatus = this.printSettings.endPageRange;				
					break;
				case 'printSilent':
					this.prefStatus = this.printSettings.printSilent;				
					break;									
				case 'showPrintProgress':
					this.prefStatus = this.printSettings.showPrintProgress;				
					break;									
				case 'printBGColors' :
					this.prefStatus = this.printSettings.printBGColors;				
					break;										
				case 'printBGImages' :
					this.prefStatus = this.printSettings.printBGImages;				
					break;										
				case 'resolution' :
					this.prefStatus = this.printSettings.resolution;				
					break;										
				case 'duplex' :
					this.prefStatus = this.printSettings.duplex;				
					break;										
				case 'title':
					this.prefStatus = this.printSettings.title;
					break;
				case 'toFileName':
					this.prefStatus = this.printSettings.toFileName;
					break;
				default :
					this.prefStatus = null;										
					this.alert('Not supported option:'+option);										
			}
		} catch (err) {
			if (this.DEBUG) this.error(err);
		}		 
		return this.prefStatus;
	},

	// get  global print options
 	getGlobalOption: function(option){
		if (!this._checkPermissions()) return null;
		this.prefStatus = null;
		try {	
			switch(option){
				case 'orientation':
					this.prefStatus = this.globalPrintSettings.orientation;
					break;
				case 'marginTop':
					this.prefStatus = this.adjustValue(this.globalPrintSettings.marginTop, kPaperSizeInches, this.paperSizeUnit);
					break;
				case 'marginLeft':
					this.prefStatus = this.adjustValue(this.globalPrintSettings.marginLeft, kPaperSizeInches, this.paperSizeUnit);
					break;
				case 'marginRight':
					this.prefStatus = this.adjustValue(this.globalPrintSettings.marginRight, kPaperSizeInches, this.paperSizeUnit);
					break;
				case 'marginBottom':
					this.prefStatus = this.adjustValue(this.globalPrintSettings.marginBottom, kPaperSizeInches, this.paperSizeUnit);
					break;
				case 'edgeTop':
					this.prefStatus = this.adjustValue(this.globalPrintSettings.edgeTop, kPaperSizeInches, this.paperSizeUnit);
					break;
				case 'edgeLeft':
					this.prefStatus = this.adjustValue(this.globalPrintSettings.edgeLeft, kPaperSizeInches, this.paperSizeUnit);
					break;
				case 'edgeBottom':
					this.prefStatus = this.adjustValue(this.globalPrintSettings.edgeBottom, kPaperSizeInches, this.paperSizeUnit);
					break;
				case 'edgeRight':
					this.prefStatus = this.adjustValue(this.globalPrintSettings.edgeRight, kPaperSizeInches, this.paperSizeUnit);
					break;
				case 'unwriteableMarginTop':
					this.prefStatus = this.adjustValue(this.globalPrintSettings.unwriteableMarginTop, kPaperSizeInches, this.paperSizeUnit);
					break;
				case 'unwriteableMarginLeft':
					this.prefStatus = this.adjustValue(this.globalPrintSettings.unwriteableMarginLeft, kPaperSizeInches, this.paperSizeUnit);
					break;
				case 'unwriteableMarginBottom':
					this.prefStatus = this.adjustValue(this.globalPrintSettings.unwriteableMarginBottom, kPaperSizeInches, this.paperSizeUnit);
					break;
				case 'unwriteableMarginRight':
					this.prefStatus = this.adjustValue(this.globalPrintSettings.unwriteableMarginRight, kPaperSizeInches, this.paperSizeUnit);
					break;
				case 'headerStrCenter':
					this.prefStatus = this.globalPrintSettings.headerStrCenter;
					break;
				case 'headerStrLeft':
					this.prefStatus = this.globalPrintSettings.headerStrLeft;
					break;
				case 'headerStrRight':
					this.prefStatus = this.globalPrintSettings.headerStrRight;
					break;
				case 'footerStrCenter':
					this.prefStatus = this.globalPrintSettings.footerStrCenter;
					break;
				case 'footerStrLeft':
					this.prefStatus = this.globalPrintSettings.footerStrLeft;
					break;
				case 'footerStrRight':
					this.prefStatus = this.globalPrintSettings.footerStrRight;
					break;
				case 'scaling':
					this.prefStatus = this.scalingConvertR(this.globalPrintSettings.scaling);				
					break;			
				case 'shrinkToFit':
					this.prefStatus = this.globalPrintSettings.shrinkToFit;
					break;
				case 'numCopies':
					this.prefStatus = this.globalPrintSettings.numCopies;				
					break;				
				case 'outputFormat':
					this.prefStatus = this.globalPrintSettings.outputFormat;				
					break;				
				case 'paperName':
					this.prefStatus = this.globalPrintSettings.paperName;				
					break;				
				case 'paperData':
					this.prefStatus = this.globalPrintSettings.paperData;				
					break;				
				case 'paperSizeType':
					this.prefStatus = this.globalPrintSettings.paperSizeType;				
					break;
				case 'paperSizeUnit':
					this.prefStatus = this.globalPrintSettings.paperSizeUnit;				
					break;				
				case 'paperHeight':
					this.prefStatus = this.getGlobalValue(this.globalPrintSettings.paperHeight);				
					break;				
				case 'paperWidth':
					this.prefStatus = this.getGlobalValue(this.globalPrintSettings.paperWidth);				
					break;												
				case 'pinterName': // for my bug compatibility
				case 'printerName':
					this.prefStatus = this.globalPrintSettings.printerName;
					break;
				case 'printRange':
					this.prefStatus = this.globalPrintSettings.printRange;				
					break;
				case 'startPageRange':
					this.prefStatus = this.globalPrintSettings.startPageRange;				
					break;
				case 'endPageRange':
					this.prefStatus = this.globalPrintSettings.endPageRange;				
					break;
				case 'printSilent':
					this.prefStatus = this.globalPrintSettings.printSilent;				
					break;									
				case 'showPrintProgress':
					this.prefStatus = this.globalPrintSettings.showPrintProgress;				
					break;									
				case 'printBGColors' :
					this.prefStatus = this.globalPrintSettings.printBGColors;				
					break;										
				case 'printBGImages' :
					this.prefStatus = this.globalPrintSettings.printBGImages;				
					break;										
				case 'resolution' :
					this.prefStatus = this.globalPrintSettings.resolution;				
					break;										
				case 'duplex' :
					this.prefStatus = this.globalPrintSettings.duplex;				
					break;										
				case 'title':
					this.prefStatus = this.globalPrintSettings.title;
					break;
				case 'toFileName':
					this.prefStatus = this.globalPrintSettings.toFileName;
					break;
				case 'DEBUG':
					this.prefStatus = this.DEBUG;				
					break;									
				default :
					this.prefStatus = null;										
					this.alert('Not supported option:'+option);
			}
		} catch (err) {
			if (this.DEBUG) this.error(err);
		}		 
		return this.prefStatus;

	},
//		
// All print configuration options can be found at
// http://kb.mozillazine.org/About:config_entries#Print..2A
//
	// set flag to display print progress true/false 	
	setShowPrintProgress: function (flag){
		if (!this._checkPermissions()) return;
		try {
			this.prefManager.setBoolPref("print.show_print_progress", flag);
		} catch (err) {
			if (this.DEBUG) this.error(err);
		}	
	},

	// get flag to display print progress
	getShowPrintProgress: function () {
		if (!this._checkPermissions()) return null;
		try {
			return this.prefManager.getBoolPref("print.show_print_progress");
		} catch (err) {
			if (this.DEBUG) this.error(err);
			return null;
		}	
	},

	// set flag for silents print process (don't display print dialog)
	setSilentPrint: function (flag) {
		if (!this._checkPermissions()) return;
		try {
			this.prefManager.setBoolPref("print.always_print_silent", flag);	
		} catch (err) {
			if (this.DEBUG) this.error(err);
		}	
	},
	
	// clear silent print always flag
	clearSilentPrint: function () {
		if (!this._checkPermissions()) return;
		try {
			this.prefManager.clearUserPref("print.always_print_silent");	
		} catch (err) {
			if (this.DEBUG) this.error(err);
		}	
	},
	
	// get flag for silents print process (don't display print dialog)
	getSilentPrint: function (){
		if (!this._checkPermissions()) return;
		try {
			return this.prefManager.getBoolPref("print.always_print_silent");	
		} catch (err) {
			if (this.DEBUG) this.error(err);
			return null;
		}	
	},
	
	//save  current printer settings to preferences
	saveOptions: function(optionSet){
		if (!this._checkPermissions()) return;
		try {
	      this.printSettingsService.savePrintSettingsToPrefs(this.printSettings, true, optionSet);
		} catch (err) {
			if (this.DEBUG) this.error(err);
		}	
	},

	// save global print settings to preferences
	saveGlobalOptions: function(optionSet){
		if (!this._checkPermissions()) return;
		try {
	      this.printSettingsService.savePrintSettingsToPrefs(this.globalPrintSettings, true, optionSet);
		} catch (err) {
			if (this.DEBUG) this.error(err);
		}	
	},
	
	// call print with current printer
	print: function() {
		if (!this._checkPermissions()) return;
		try {				
			var webBrowserPrint = this.getWebBrowserPrint(null);				
			//Check to see if an nsIWebProgressListener was provided, if so, use it.
			webBrowserPrint.print(this.printSettings, this.printProgressListener);  
		} catch (err) {
			if (this.DEBUG) this.error(err);
		}	
	},

	printWindow: function(aWindow) {
		if (!this._checkPermissions()) return;
		try {
			// used nsISupports for aWindow instead of nsIDOMWindow, because is changed UUID of nsIDOMWindow 
			// from FF6 to be compadible in versions before and after FF6 we use nsISupports
			var awin = aWindow.QueryInterface(Components.interfaces.nsIDOMWindow);			
			var webBrowserPrint = this.getWebBrowserPrint(awin);
			webBrowserPrint.print(this.printSettings, this.printProgressListener); //this.printSettings, null
		} catch (err) {
			if (this.DEBUG) this.error(err);
		}	
	},

	setPrintProgressListener: function(aListener) {
		if (!this._checkPermissions()) return;
		try {
			if (aListener) {
				this.printProgressListener = aListener.QueryInterface(Components.interfaces.nsIWebProgressListener);
			} else
				this.printProgressListener = null;	
		} catch (err) {
			this.error(err);
		}	
	},

	printPreview: function() {
		this.alert("This version doesn't implement method printPreview! ");
	},
	 
	// refreshresh printer options
	refreshOptions: function(){
		if (!this._checkPermissions()) return;
//		this.printSettings = this.printSettingsService.globalPrintSettings
//		.QueryInterface(Components.interfaces.nsIPrintSettings);
//		this.printSettings.printerName = this.printerName;
		try {
			// This is part from mozilla toolkit printUtils.js
			// First get any defaults from the printer 		
			this.printSettings.printerName = ''; 		
			this.printSettingsService.initPrintSettingsFromPrinter(this.printerName, this.printSettings);
			// now augment them with any values from last time
			this.printSettingsService.initPrintSettingsFromPrefs(this.printSettings, true, this.printSettingsInterface.kInitSaveAll);
		} catch (err) {
			if (this.DEBUG) this.error(err);
		}	
	},

}; // jsPrintSetup.property

// Registration
if (XPCOMUtils.generateNSGetFactory)
	var NSGetFactory = XPCOMUtils.generateNSGetFactory([jsPrintSetup]);
else
	var NSGetModule = XPCOMUtils.generateNSGetModule([jsPrintSetup]);
	
