const templaterData = {}

templaterData ["A tab"]  = {
    "Example of word replacement (curly brackets)" : {
        "Firstname" : "Marcus",
        "Lastname" : "Aurelius",
        "Wiki" : "https://en.wikipedia.org/wiki/{Firstname}_{Lastname}",
    },
    "Example of prompted input (square brackets)" : {
        "Marcus Aurelius [1-12]" : "https://en.wikisource.org/wiki/The_Meditations_of_the_Emperor_Marcus_Antoninus/Book_[number]",
        "Note" : "The values prompted previously will be kept in the localstorage",
    },
    "Other features" : {
        "Secret" : "secret:mySuperSecretPassword123",
        "Displaying an array of values" : [
             "http://example.com",
             "NOTE: An array is a good way to add a note or a comment together with a value",
             "COMMENT: The advantage of an array over an object is that it's always displayed, not in a folder" ,
             { test : "This is an object inside an array, and it will be displayed as a folder, but the key 'test' will not be shown in the UI" },
             "Just an extra element after having an object in the array, to show that you can mix different types of values in the same array"
        ],
        "Note" : "This is the first 'note' key, and it will NOT be displayed in the UI",
        "Note" : "A repeating key in an object will be overritten, not showing in the UI",
        "Other object" : {
            "Note" : "But the same key can be reused in a nested object, and it will be displayed in the UI",
            "numbers" : 122232,
        }
    },
}

templaterData ["Another tab"]  = {
    "Other stuff" : "https://en.wikipedia.org/wiki/Seneca_the_Younger",
}

templaterData ["One more tab"]  = {
    "Wait, wait, there's more" : "https://en.wikipedia.org/wiki/Epictetus",
}
