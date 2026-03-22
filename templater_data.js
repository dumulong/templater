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
        "hidden" : {
            "hidden note" : "An object with 'hidden' for key will not be displayed in the UI, but its values can still be used in subsequent word replacements.",
            "hidden note2" : "This feature allows you to build link values that are composed of multiple parts, without showing those parts in the UI."
        },
        "Hidding" : "{hidden note}<br>{hidden note2}",
        "Note" : "This is the first 'note' key, and it will NOT be displayed in the UI",
        "Note" : "A repeating key in an object will be overritten, not showing in the UI",
        "Other object" : {
            "Note" : "But the same key can be reused in a nested object, and it will be displayed in the UI"
        },
    },
}

templaterData ["Another tab"]  = {
    "Other stuff" : "https://en.wikipedia.org/wiki/Seneca_the_Younger",
}

templaterData ["One more tab"]  = {
    "Wait, wait, there's more" : "https://en.wikipedia.org/wiki/Epictetus",
}
