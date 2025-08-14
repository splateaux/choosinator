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
  optionsListId *String          
  sharedWithUserId **String      
  userId String                  
  permission String
  createdAt String

poll
  pollId *String
  optionsListId String
  name String
  createdByUserId String
  createdAt String  

pollPresence
  pollId *String
  clientId **String
  displayName String
  lastSeenAt Number
  ttl Number

pollConnections
  pk *String
  sk **String
  userId String
  domainName String
  stage String
  ttl Number

pollVote
  pk *String
  sk **String
  userId String
  optionId String
  updatedAt String
  stream true

@tables-indexes
pollConnections
  sk *String
  pk **String
  name sk-pk-index
  projection all

optionsListSharing
  sharedWithUserId *String
  optionsListId **String
  name sharedWithUserId-optionsListId-index
  projection all

optionsListSharing
  userId *String
  optionsListId **String
  name userId-optionsListId-index
  projection all

@events
vote-updated
  src events/vote-updated

@ws
connect
  src ws/connect
disconnect
  src ws/disconnect
default
  src ws/default

@table-streams
pollVote
  src streams/pollVote