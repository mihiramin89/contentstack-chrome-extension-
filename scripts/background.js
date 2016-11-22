chrome.browserAction.onClicked.addListener(function (tab) { //Fired when User Clicks ICON
    	chrome.browserAction.setIcon({
		  path : {
		    "19": "img/badge16.png",
		    "38": "img/badge32.png",
		    "48": "img/badge48.png"
		  }, tabId: tab.id
		});
    	chrome.tabs.insertCSS(tab.id,{
    		"file": "css/styles.css"
	    	}, function() {
	    		console.log("injecting CSS styles");
	    	});
    	chrome.tabs.executeScript(tab.id, {
	        "file": "scripts/jquery-3.1.1.min.js"
	        }, function () { // Execute your code
	            console.log("Injected jquery file .. "); // Notification on Completion
	        });
   		chrome.tabs.executeScript(tab.id, {
	        "file": "scripts/scripts.js"
	        }, function () { // Execute your code
	            console.log("Script Executed .. "); // Notification on Completion
	        });
});