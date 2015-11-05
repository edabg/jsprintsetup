# JS Print Setup Firefox Addon

JS Print Setup Firefox addon allows client side Javascript manipulate printer settingsand control print process. 
This extension implements print setup from CS Javascript, similar of MeadCo's ScriptX ActiveX control for Internet Explorer.
Extension creates global object called 'jsPrintSetup', which implements methods to get/set print Page Setup options. This is useful for developers who wants to control page setup options from their Javascript code.

## Features

* Get/Set print settings - margins, orientation, scaling, header and footer
* Get/Set global print settings and for selected printer
* Working with installed printers
* Save print settings to user preferences
* Print with current setttings without need from saving to user pereferences as required from 'window.print()'
* Print desired window or frame
* Unattended printing without print dialog
* Enhanced Paper data handling
* Host based Security Access Control

**Important Note!**

If your application is not conformable with jsPrintSetup access control, most of features of jsPrintSetup will be inaccessible if user who is using application block access to jsPrintSetup on first request for permission.
Your application must implement these methods to get information about user's decision and rerequest permissions if needed or get alternate decision.

## Example

Sample code which demonstrate using of JSPrintSetup to setup print margins and call unattended print method (without print dialog).

```javascript
// set portrait orientation
jsPrintSetup.setOption('orientation', jsPrintSetup.kPortraitOrientation);
// set top margins in millimeters
jsPrintSetup.setOption('marginTop', 15);
jsPrintSetup.setOption('marginBottom', 15);
jsPrintSetup.setOption('marginLeft', 20);
jsPrintSetup.setOption(' marginRight', 10);
// set page header
jsPrintSetup.setOption('headerStrLeft', 'My custom header');
jsPrintSetup.setOption('headerStrCenter', '');
jsPrintSetup.setOption('headerStrRight', '&PT');
// set empty page footer
jsPrintSetup.setOption('footerStrLeft', '');
jsPrintSetup.setOption('footerStrCenter', '');
jsPrintSetup.setOption('footerStrRight', '');
// Suppress print dialog
jsPrintSetup.setSilentPrint(true);
// Do Print
jsPrintSetup.print();
// Restore print dialog
jsPrintSetup.setSilentPrint(false);
```
