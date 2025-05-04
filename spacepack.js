var namedRequireMap = {
    p: "publicPath",
     s: "entryModuleId",
     c: "moduleCache",
     m: "moduleFactories",
     e: "ensureChunk",
     f: "ensureChunkHandlers",
     E: "prefetchChunk",
     F: "prefetchChunkHandlers",
     G: "preloadChunk",
     H: "preloadChunkHandlers",
     d: "definePropertyGetters",
     r: "makeNamespaceObject",
     t: "createFakeNamespaceObject",
     n: "compatGetDefaultExport",
     hmd: "harmonyModuleDecorator",
     nmd: "nodeModuleDecorator",
     h: "getFullHash",
     w: "wasmInstances",
     v: "instantiateWasm",
     oe: "uncaughtErrorHandler",
     nc: "scriptNonce",
     l: "loadScript",
     ts: "createScript",
     tu: "createScriptUrl",
     tt: "getTrustedTypesPolicy",
     cn: "chunkName",
     j: "runtimeId",
     u: "getChunkScriptFilename",
     k: "getChunkCssFilename",
     hu: "getChunkUpdateScriptFilename",
     hk: "getChunkUpdateCssFilename",
     x: "startup",
     X: "startupEntrypoint",
     O: "onChunksLoaded",
     C: "externalInstallChunk",
     i: "interceptModuleExecution",
     g: "global",
     S: "shareScopeMap",
     I: "initializeSharing",
     R: "currentRemoteGetScope",
     hmrF: "getUpdateManifestFilename",
     hmrM: "hmrDownloadManifest",
     hmrC: "hmrDownloadUpdateHandlers",
     hmrD: "hmrModuleData",
     hmrI: "hmrInvalidateModuleHandlers",
     hmrS: "hmrRuntimeStatePrefix",
     amdD: "amdDefine",
     amdO: "amdOptions",
     System: "system",
     o: "hasOwnProperty",
     y: "systemContext",
     b: "baseURI",
     U: "relativeUrl",
     a: "asyncModule"
};


function getNamedRequire(webpackRequire) {
    const namedRequireObj = {};
    Object.getOwnPropertyNames(webpackRequire).forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(namedRequireMap, key)) {
            namedRequireObj[namedRequireMap[key]] = webpackRequire[key];
        }
    });
    return namedRequireObj;
}


function matchModule(moduleStr, queryArg) {
    const queryArray = queryArg instanceof Array ? queryArg : [queryArg];
    return !queryArray.some((query) => {
        if (query instanceof RegExp) {
            return !query.test(moduleStr);
        } else {
            return !moduleStr.includes(query);
        }
    });
}

function getSpacepack(chunkObject, logSuccess = false) {
    function spacepack(module, exports, webpackRequire) {
        if (logSuccess) {
            if (!chunkObject) {
                console.log("[wpTools] spacepack loaded with no chunk");
            } else {
                console.log("[wpTools] spacepack loaded into " + chunkObject);
            }
        }
        function findByExports(keysArg) {
            if (!webpackRequire.c) {
                throw new Error("webpack runtime didn't export its moduleCache");
            }
            const keys = keysArg instanceof Array ? keysArg : [keysArg];
            return Object.entries(webpackRequire.c).filter(([moduleId, exportCache]) => {
                return !keys.some((searchKey) => {
                    return !(exportCache !== void 0 && exportCache !== window && (exports?.[searchKey] || exports?.default?.[searchKey]));
                });
            }).map(([moduleId, exportCache]) => {
                return exportCache;
            });
        }
        function findByCode(search) {
            return Object.entries(webpackRequire.m).filter(([moduleId, moduleFunc]) => {
                const funcStr = Function.prototype.toString.apply(moduleFunc);
                return matchModule(funcStr, search);
            }).map(([moduleId, moduleFunc]) => {
                try {
                    return {
                        id: moduleId,
                         exports: webpackRequire(moduleId)
                    };
                } catch (error) {
                    console.error("Failed to require module: " + error);
                    return {
                        id: moduleId,
                         exports: {}
                    };
                }
            });
        }
        function findObjectFromKey(exports2, key) {
            let subKey;
            if (key.indexOf(".") > -1) {
                const splitKey = key.split(".");
                key = splitKey[0];
                subKey = splitKey[1];
            }
            for (const exportKey in exports2) {
                const obj = exports2[exportKey];
                if (obj && obj[key] !== void 0) {
                    if (subKey) {
                        if (obj[key][subKey])
                        return obj;
                    } else {
                        return obj;
                    }
                }
            }
            return null;
        }
        function findObjectFromValue(exports2, value) {
            for (const exportKey in exports2) {
                const obj = exports2[exportKey];
                if (obj == value)
                return obj;
                for (const subKey in obj) {
                    if (obj && obj[subKey] == value) {
                        return obj;
                    }
                }
            }
            return null;
        }
        function findObjectFromKeyValuePair(exports2, key, value) {
            for (const exportKey in exports2) {
                const obj = exports2[exportKey];
                if (obj && obj[key] == value) {
                    return obj;
                }
            }
            return null;
        }
        function findFunctionByStrings(exports2, ...strings) {
            return Object.entries(exports2).filter(([index, func]) => typeof func === "function" && !strings.some((query) => !(query instanceof RegExp ? func.toString().match(query) : func.toString().includes(query))))?.[0]?.[1] ?? null;
        }
        function inspect(moduleId) {
            return webpackRequire.m[moduleId];
        }
        const exportedRequire = module.exports.default = exports.default = {
             require: webpackRequire,
             modules: webpackRequire.m,
             cache: webpackRequire.c,
             __namedRequire: getNamedRequire(webpackRequire),
             findByCode,
             findByExports,
             findObjectFromKey,
             findObjectFromKeyValuePair,
             findObjectFromValue,
             findFunctionByStrings,
             inspect
        };
        if (chunkObject) {
            exportedRequire.chunkObject = window[chunkObject];
            exportedRequire.name = chunkObject;
        }
        unsafeWindow["spacepack"] = exportedRequire;
    }
    spacepack.__wpt_processed = true;
    return spacepack;
}



var onChunkLoaded = function(webpackRequire) {
    webpackRequire("spacepack");
};
onChunkLoaded[0] = ["spacepack"];
onChunkLoaded[Symbol.iterator] = function() {
    return {
        read: false,
         next() {
            if (!this.read) {
                this.read = true;
                return {
                    done: false,
                    value: 0
                };
            } else {
                return {
                    done: true
                };
            }
        }
    };
};

function pushSpacepack(chunkObject){
  chunkObject.push([
    ["spacepack"], {
        spacepack: getSpacepack(chunkObjectName, true)
    },
    onChunkLoaded
  ]);
}
