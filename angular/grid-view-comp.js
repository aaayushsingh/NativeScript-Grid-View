"use strict";
/*! *****************************************************************************
Copyright (c) 2019 Tangra Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
***************************************************************************** */
Object.defineProperty(exports, "__esModule", { value: true });
var core_1 = require("@angular/core");
var templated_items_comp_1 = require("nativescript-angular/directives/templated-items-comp");
var element_registry_1 = require("nativescript-angular/element-registry");
var grid_view_1 = require("../grid-view");
var GridViewComponent = (function (_super) {
    __extends(GridViewComponent, _super);
    function GridViewComponent(_elementRef, _iterableDiffers) {
        return _super.call(this, _elementRef, _iterableDiffers) || this;
    }
    GridViewComponent_1 = GridViewComponent;
    Object.defineProperty(GridViewComponent.prototype, "nativeElement", {
        get: function () {
            return this.templatedItemsView;
        },
        enumerable: true,
        configurable: true
    });
    var GridViewComponent_1;
    GridViewComponent = GridViewComponent_1 = __decorate([
        core_1.Component({
            selector: "GridView",
            template: "\n        <DetachedContainer>\n            <Placeholder #loader></Placeholder>\n        </DetachedContainer>",
            changeDetection: core_1.ChangeDetectionStrategy.OnPush,
            providers: [{ provide: templated_items_comp_1.TEMPLATED_ITEMS_COMPONENT, useExisting: core_1.forwardRef(function () { return GridViewComponent_1; }) }]
        })
    ], GridViewComponent);
    return GridViewComponent;
}(templated_items_comp_1.TemplatedItemsComponent));
exports.GridViewComponent = GridViewComponent;
if (!element_registry_1.isKnownView("GridView")) {
    element_registry_1.registerElement("GridView", function () { return grid_view_1.GridView; });
}
