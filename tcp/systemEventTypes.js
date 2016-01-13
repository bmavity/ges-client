var systemEventTypes = {};

Object.defineProperties(systemEventTypes, {
    streamDeleted: {value: '$streamDeleted'}
    , statsCollection: {value: '$statsCollected'}
    , linkTo: {value: '$>'}
    , streamMetadata: {value: '$metadata'}
    , settings: {value: '$settings'}
});

module.exports = systemEventTypes;
