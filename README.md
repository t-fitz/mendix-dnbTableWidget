# mendix-dnbTableWidget

Welcome Mendix users. Here's a widget to enhance the standard Mendix tables. 

No dependencies. Small size. Mostly vanilla javascript with a little Dojo thrown in for some browser compatability goodness.

------
###What does it do?

Functionality-wise you can:
- specify whether a column is visible or not
- change the order of the columns
- change the widths of the columns
- save the column layout for your next visit using localStorage

------
###How to get it to work?

Just download the latest release. Add the .mpk file to your projects widget folder. Open your project (press F4 if your project is already open). The dnbTableWidget will now be available in the Add-on dropdown when you're styling a page.

Put the widget on the page with a table. Give the table a unique class name. Use the same class name in the widgets ClassName attribute. Run and done.

You can also specify the text you want in the settings button, whether you want to see a settings icon in the button and what the wording will be when you hover over the settings button.

** pictures coming soon **

------
###Where will it work?

I've tested this in Mendix 5 so you should be good for use in Mendix 5 and 6. 

As this uses the newer widget definition style it won't work, as is, in Mendix 4. Of course that doesn't stop you from scooping out the guts of the widget and putting it in a Mendix 4 widget template. Let me know if you do so I can link to it.

------
###Bugs and other stuff

Do let me know if you run into any troubles using this widget. Pictures and error codes welcomed.

Any ideas to make this better? What?! Impossible!! Well maybe. Ok, let me know if you need more functionality or if you have ideas to make the code better, faster, stronger.
