@app
choosinator

@aws
runtime nodejs18.x
# concurrency 1
# memory 1152
# profile default
# region us-west-1
# timeout 30

@http
/*
  method any
  src server

@plugins
plugin-remix
  src plugin-remix.js

@static

@tables
user
  userId *String

password
  userId *String

optionsList
  userId *String
  optionsListId **String 

option
  optionsListId *String
  optionId **String 

optionsListSharing
  userId *String 
  optionsListId **String
  sharedWithUserId String
  createdAt String

@tables-indexes
optionsList
  optionsListId *String

optionsListSharing
  sharedWithUserId *String
  optionsListId **String