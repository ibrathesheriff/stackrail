# stackrail
StackRail is a command-line interface (CLI) tool designed to help you efficiently manage and track your coding projects. Inspired by the principles of stack-based organization, MoSCoW prioritization, RICE scoring model and guided progress, StackRail helps you maintain clarity and momentum, especially when picking up projects after a break.

## Installation
TBC

## Running
```shell
node index.js
```
Or,
```shell
npm run stackrail
```

### Example Usage
TBC

## TODO

## Wrapping v1
[] Cannot run verify if there is no `.profile` file.
[] Add a changelog
[] Updating of tasks
[] Add docs folder:
    - project logo
    - command manual
    - resources used
[] Change rail constraint from title uniqueness to title-project-ID uniqueness

## Future Work
[] Handle all errors gracefully e.g.
    - UND_ERR_CONNECT_TIMEOUT
[] Make it possible to change the default tags.
[] Automatically add tags based on the task title and description.
[] Check if a new task is a duplicate of an existing "open" (i.e. not complete) task.
[] When adding a new task compare to "won't have" to ensure it's a relevant task.
[] Question the relevance of a new task. Question the Dev's scoring of the task.
[] Pull tasks from source files - TODO/FIXME/BUG/HACK/COMBAK in code automatically.
[] Use the [Decorator Pattern](https://medium.com/@artemkhrenov/the-decorator-pattern-in-modern-javascript-adding-functionality-without-breaking-code-b43d9c237047)