
- Add more tests
- Deal with the search vs selected tab "weirdness
- I need a way to "prefill" the adhoc replacements "[]"


## Replacement explanation

There are 2 types of replacements: square brackets "[]" and curly brackets "{}"

Square brackets "[]" replacement
- This type of variable replacement get its values from the `Local Storage` (LS).
- Note that the local storage will be deleted when the browser is closed.
- Clicking on a link or the copy button who has square brackets will prompt for a value.  If you already have a value in your LS, the value will be defaulted to it. If you override the default value, this new value will become the default by overriding the LS value.
- This type lends itself wel to generate temporary values that you do not need long term and wouldn't mind losing.
- It's very useful to exchange values with coworkers 

Curly brackets "{}"
- This type of variable replacement get its values from the `templater_data.js` file.
- Since the variables are in a file, you won't lose them when a browser is closed.
- The replacement variable will be taking its value from a sibling property of or the closest parent object.
- 


