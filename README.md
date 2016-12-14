# contentstack-chrome-extension-
A chrome extension for contentstack.built.io that allows the user to click on an element from a contentstack website and be taken to the latest revision of that element.


# Setup steps
In order to get your contentstack to work with the google chrome extension, some attributes need to be added to your templates. The steps below go through how to add these attributes to your local contentstack repository. In order for the extension to work on your published site, the same steps need to be followed and pushed to the published site's repository.

1. You need to have a contentstack developer account and be able to create & manipulate stacks & environments. 
2. Follow the steps on contentstacks developer wiki to download & install the developer repository. (see link below): https://contentstackdocs.built.io/developer/web/installation
3. Modify all index.html files inside the themes/basic/templates/pages
4. add the following attributes to the section tags inside the index.html files. 

     data-content-type-id="{{content_type}}" data-entry-id="{{entry.uid}}"

    
5. Save and launch the local repo and you should be all set.


# How to use the extension
Once the setup steps are completed, the only remaining step is to load the extension. Below is a sample workflow for using the extension. 
NOTE: Contenstack.built.io & contentstack api calls work independently of each other. Currently there is no way for both to communicate with each other, so there is an additional step required to use this extension. The user needs to manually go to the contentstack.built.io website and log in there, in addition to logging into the contentstack via the extension. If an API becomes available, this issue will be addressed.

1. Navigate to contentstack.built.io and login (this step needs to be done due to the note mentioned above). This will have to be done every time your contentstack session expires.
2. Navigate to your contentstack published website
3. Click on the chrome extension in the toolbar. 
4. Login to contentstack via the extension (click the login link and run through the form)
5. Turn on the extension for this tab (toggle the switch to the "ON" position)
6. You can now hover over any DOM element and should see a colored rectangle around the element
7. Clicking on an element once will show a popup that will give the latest revision information for that element.
8. An additional click on that element will launch a new tab that will take you to that specific revision.


NOTE: This extension is independent of each tab. You should be able to turn it off/on for each tab. 
