![](https://raw.githubusercontent.com/poulfoged/Cityline.Client/master/icon.png) &nbsp; 
[![Build status](https://ci.appveyor.com/api/projects/status/alo6m88g5titnq5r?svg=true)](https://ci.appveyor.com/project/poulfoged/cityline-client) &nbsp; 
[![Nuget version](https://img.shields.io/npm/v/cityline-client)](https://www.npmjs.com/package/cityline-client)

# Cityline-Client

Cityline Client for dotnet core for connecting to a [Cityline.Server](https://github.com/poulfoged/Cityline.Server)-instance.

```
 This library (JavaScript)               Server side (dotnet)

 ┌──────────────────────────────┐       ┌──────────────────────────────┐      ┌──────────────────────────────┐
 │                              │       │                              │      │                              ├─┐
 │                              │       │                              │      │                              │ │
 │       Cityline-Client        │◀─────▶│       Cityline.Server        │─────▶│      ICitylineProducer       │ │
 │                              │       │                              │      │                              │ │
 │                              │       │                              │      │                              │ │
 └──────────────────────────────┘       └──────────────────────────────┘      └──┬───────────────────────────┘ │
                                                                                 └─────────────────────────────┘

  - raises events                         - streams data to clients
  - get specific frame                    - calls producers
    (for preloading data)                 - allows state from call to call
  - wait for specific set of frames
    (app initialization)
```

## Demo

See a demo of the server and javascript client [here](https://poulfoged.github.io/Cityline-Chat).

## Getting started

To get started create a new instance of the client pointing directly to the servers cityline endpoint:

```typescript
  var client = new CitylineClient(new Uri("https://my-server/cityline"));
```

You then subscribe to named events (this mirrors the .Name property of each producer)

```typescript
  cityline.addEventListener("ping", (event: CustomEvent<Ping>) => console.log("ping"));
```