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

import { KeyedTemplate, Length, View } from "ui/core/view";
import { GridLayout } from "ui/layouts/grid-layout";
import * as utils from "utils/utils";

import {
  GridViewBase,
  colWidthProperty,
  itemTemplatesProperty,
  orientationProperty,
  paddingBottomProperty,
  paddingLeftProperty,
  paddingRightProperty,
  paddingTopProperty,
  rowHeightProperty
} from "./grid-view-common";

import { GridItemEventData, Orientation, ScrollEventData } from ".";

export * from "./grid-view-common";

// Used to designate a view as as a DUMMY created view (to cope with angular view generation)
const DUMMY = "DUMMY";

export class GridView extends GridViewBase {
  public nativeView: androidx.recyclerview.widget.RecyclerView;
  public _realizedItems = new Map<android.view.View, View>();

  public createNativeView() {
    initGridViewRecyclerView();
    const recyclerView = new GridViewRecyclerView(
      this._context,
      new WeakRef(this)
    );

    initGridViewAdapter();
    const adapter = new GridViewAdapter(new WeakRef(this));
    adapter.setHasStableIds(true);
    recyclerView.setAdapter(adapter);
    (recyclerView as any).adapter = adapter;

    const orientation = this._getLayoutManagarOrientation();

    const layoutManager = new androidx.recyclerview.widget.GridLayoutManager(
      this._context,
      1
    );
    recyclerView.setLayoutManager(layoutManager);
    layoutManager.setOrientation(orientation);
    (recyclerView as any).layoutManager = layoutManager;

    initGridViewScrollListener();
    const scrollListener = new GridViewScrollListener(new WeakRef(this));
    recyclerView.addOnScrollListener(scrollListener);
    (recyclerView as any).scrollListener = scrollListener;

    return recyclerView;
  }

  public initNativeView() {
    super.initNativeView();

    const nativeView = this.nativeView as any;
    nativeView.adapter.owner = new WeakRef(this);
    nativeView.scrollListener.owner = new WeakRef(this);
    nativeView.owner = new WeakRef(this);

    colWidthProperty.coerce(this);
    rowHeightProperty.coerce(this);
  }

  public disposeNativeView() {
    // clear the cache
    this.eachChildView((view: any) => {
      view.parent._removeView(view);
      return true;
    });
    this._realizedItems.clear();

    const nativeView = this.nativeView as any;
    this.nativeView.removeOnScrollListener(nativeView.scrollListener);

    nativeView.scrollListener = null;
    nativeView.adapter = null;
    nativeView.layoutManager = null;

    super.disposeNativeView();
  }

  get android(): androidx.recyclerview.widget.RecyclerView {
    return this.nativeView;
  }

  get _childrenCount(): number {
    return this._realizedItems.size;
  }

  public [paddingTopProperty.getDefault](): number {
    return ((this.nativeView as any) as android.view.View).getPaddingTop();
  }
  public [paddingTopProperty.setNative](value: Length) {
    this._setPadding({ top: this.effectivePaddingTop });
  }

  public [paddingRightProperty.getDefault](): number {
    return ((this.nativeView as any) as android.view.View).getPaddingRight();
  }
  public [paddingRightProperty.setNative](value: Length) {
    this._setPadding({ right: this.effectivePaddingRight });
  }

  public [paddingBottomProperty.getDefault](): number {
    return ((this.nativeView as any) as android.view.View).getPaddingBottom();
  }
  public [paddingBottomProperty.setNative](value: Length) {
    this._setPadding({ bottom: this.effectivePaddingBottom });
  }

  public [paddingLeftProperty.getDefault](): number {
    return ((this.nativeView as any) as android.view.View).getPaddingLeft();
  }
  public [paddingLeftProperty.setNative](value: Length) {
    this._setPadding({ left: this.effectivePaddingLeft });
  }

  public [orientationProperty.getDefault](): Orientation {
    const layoutManager = this.nativeView.getLayoutManager() as androidx.recyclerview.widget.GridLayoutManager;
    if (
      layoutManager.getOrientation() ===
      androidx.recyclerview.widget.LinearLayoutManager.HORIZONTAL
    ) {
      return "horizontal";
    }

    return "vertical";
  }
  public [orientationProperty.setNative](value: Orientation) {
    const layoutManager = this.nativeView.getLayoutManager() as androidx.recyclerview.widget.GridLayoutManager;
    if (value === "horizontal") {
      layoutManager.setOrientation(
        androidx.recyclerview.widget.LinearLayoutManager.HORIZONTAL
      );
    } else {
      layoutManager.setOrientation(
        androidx.recyclerview.widget.LinearLayoutManager.VERTICAL
      );
    }
  }

  public [itemTemplatesProperty.getDefault](): KeyedTemplate[] {
    return null;
  }
  public [itemTemplatesProperty.setNative](value: KeyedTemplate[]) {
    this._itemTemplatesInternal = new Array<KeyedTemplate>(
      this._defaultTemplate
    );
    if (value) {
      this._itemTemplatesInternal = this._itemTemplatesInternal.concat(value);
    }

    this.nativeViewProtected.setAdapter(new GridViewAdapter(new WeakRef(this)));
    this.refresh();
  }

  public eachChildView(callback: (child: View) => boolean): void {
    this._realizedItems.forEach((view, key) => {
      callback(view);
    });
  }

  public onLayout(left: number, top: number, right: number, bottom: number) {
    super.onLayout(left, top, right, bottom);
    this.refresh();
  }

  public refresh() {
    if (!this.nativeView || !this.nativeView.getAdapter()) {
      return;
    }

    const layoutManager = this.nativeView.getLayoutManager() as androidx.recyclerview.widget.GridLayoutManager;
    let spanCount: number;

    if (this.orientation === "horizontal") {
      spanCount =
        Math.max(Math.floor(this._innerHeight / this._effectiveRowHeight), 1) ||
        1;
    } else {
      spanCount =
        Math.max(Math.floor(this._innerWidth / this._effectiveColWidth), 1) ||
        1;
    }

    layoutManager.setSpanCount(spanCount);

    this.nativeView.getAdapter().notifyDataSetChanged();
  }

  public scrollToIndex(index: number, animated: boolean = true) {
    if (animated) {
      this.nativeView.smoothScrollToPosition(index);
    } else {
      this.nativeView.scrollToPosition(index);
    }
  }

  private _setPadding(newPadding: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  }) {
    const nativeView: android.view.View = this.nativeView as any;
    const padding = {
      top: nativeView.getPaddingTop(),
      right: nativeView.getPaddingRight(),
      bottom: nativeView.getPaddingBottom(),
      left: nativeView.getPaddingLeft()
    };
    // tslint:disable-next-line:prefer-object-spread
    const newValue = Object.assign(padding, newPadding);
    nativeView.setPadding(
      newValue.left,
      newValue.top,
      newValue.right,
      newValue.bottom
    );
  }

  private _getLayoutManagarOrientation() {
    let orientation = androidx.recyclerview.widget.LinearLayoutManager.VERTICAL;
    if (this.orientation === "horizontal") {
      orientation = androidx.recyclerview.widget.LinearLayoutManager.HORIZONTAL;
    }

    return orientation;
  }
}

// Snapshot friendly GridViewScrollListener
interface GridViewScrollListener
  extends androidx.recyclerview.widget.RecyclerView.OnScrollListener {
  // tslint:disable-next-line:no-misused-new
  new (owner: WeakRef<GridView>): GridViewScrollListener;
}

let GridViewScrollListener: GridViewScrollListener;

function initGridViewScrollListener() {
  if (GridViewScrollListener) {
    return;
  }
  class GridViewScrollListenerImpl extends androidx.recyclerview.widget
    .RecyclerView.OnScrollListener {
    constructor(private owner: WeakRef<GridView>) {
      super();

      return global.__native(this);
    }

    public onScrolled(
      view: androidx.recyclerview.widget.RecyclerView,
      dx: number,
      dy: number
    ) {
      const owner: GridView = this.owner.get();
      if (!owner) {
        return;
      }

      owner.notify<ScrollEventData>({
        eventName: GridViewBase.scrollEvent,
        object: owner,
        scrollX: dx,
        scrollY: dy
      });

      const lastVisibleItemPos = (view.getLayoutManager() as androidx.recyclerview.widget.GridLayoutManager).findLastCompletelyVisibleItemPosition();
      if (owner && owner.items) {
        const itemCount = owner.items.length - 1;
        if (lastVisibleItemPos === itemCount) {
          owner.notify({
            eventName: GridViewBase.loadMoreItemsEvent,
            object: owner
          });
        }
      }
    }

    public onScrollStateChanged(
      view: androidx.recyclerview.widget.RecyclerView,
      newState: number
    ) {
      // Not Needed
    }
  }

  GridViewScrollListener = GridViewScrollListenerImpl as any;
}
// END snapshot friendly GridViewScrollListener

// Snapshot friendly GridViewAdapter
interface GridViewAdapter
  extends androidx.recyclerview.widget.RecyclerView.Adapter {
  // tslint:disable-next-line:no-misused-new
  new (owner: WeakRef<GridView>): GridViewAdapter;
}

let GridViewAdapter: GridViewAdapter;

function initGridViewAdapter() {
  if (GridViewAdapter) {
    return;
  }

  @Interfaces([android.view.View.OnClickListener])
  class GridViewCellHolder
    extends androidx.recyclerview.widget.RecyclerView.ViewHolder
    implements android.view.View.OnClickListener {
    constructor(
      private owner: WeakRef<View>,
      private gridView: WeakRef<GridView>
    ) {
      super(owner.get().android);

      const nativeThis = global.__native(this);
      const nativeView = owner.get().android as android.view.View;
      nativeView.setOnClickListener(nativeThis);

      return nativeThis;
    }

    get view(): View {
      return this.owner ? this.owner.get() : null;
    }

    public onClick(v: android.view.View) {
      const gridView = this.gridView.get();

      gridView.notify<GridItemEventData>({
        eventName: GridViewBase.itemTapEvent,
        object: gridView,
        index: this.getAdapterPosition(),
        view: this.view,
        android: v,
        ios: undefined
      });
    }
  }

  class GridViewAdapterImpl extends androidx.recyclerview.widget.RecyclerView
    .Adapter {
    constructor(private owner: WeakRef<GridView>) {
      super();

      return global.__native(this);
    }

    public getItemCount() {
      const owner = this.owner.get();
      return owner.items ? owner.items.length : 0;
    }

    public getItem(i: number) {
      const owner = this.owner.get();
      if (owner && owner.items && i < owner.items.length) {
        return owner._getDataItem(i);
      }

      return null;
    }

    public getItemId(i: number) {
      const owner = this.owner.get();
      const item = this.getItem(i);
      let id = i;
      if (this.owner && item && owner.items) {
        id = owner.itemIdGenerator(item, i, owner.items);
      }
      return long(id);
    }

    public getItemViewType(index: number) {
      const owner = this.owner.get();
      const template = owner._getItemTemplate(index);
      const itemViewType = owner._itemTemplatesInternal.indexOf(template);

      return itemViewType;
    }

    public onCreateViewHolder(
      parent: android.view.ViewGroup,
      viewType: number
    ): androidx.recyclerview.widget.RecyclerView.ViewHolder {
      const owner = this.owner.get();
      const template = owner._itemTemplatesInternal[viewType];
      let view = template.createView();

      if (!view) {
        view = new GridLayout();
        view[DUMMY] = true;
      }

      owner._addView(view);

      owner._realizedItems.set(view.android, view);

      return new GridViewCellHolder(new WeakRef(view), new WeakRef(owner));
    }

    public onBindViewHolder(vh: GridViewCellHolder, index: number) {
      const owner = this.owner.get();
      const args: GridItemEventData = {
        eventName: GridViewBase.itemLoadingEvent,
        object: owner,
        index,
        // This is needed as the angular view generation with a single template is done in the event handler
        // for this event (????). That;s why if we created above an empty StackLayout, we must send `null`
        // sp that the angular handler initializes the correct view.
        view: vh.view[DUMMY] ? null : vh.view,
        android: vh,
        ios: undefined
      };
      owner.notify(args);

      if (vh.view[DUMMY]) {
        (vh.view as GridLayout).addChild(args.view);
        vh.view[DUMMY] = undefined;
      }

      if (owner.orientation === "horizontal") {
        vh.view.width = utils.layout.toDeviceIndependentPixels(
          owner._effectiveColWidth
        );
      } else {
        vh.view.height = utils.layout.toDeviceIndependentPixels(
          owner._effectiveRowHeight
        );
      }

      owner._prepareItem(vh.view, index);
    }
  }

  GridViewAdapter = GridViewAdapterImpl as any;
}
// END Snapshot friendly GridViewAdapter

// Snapshot friendly GridViewRecyclerView
interface GridViewRecyclerView
  extends androidx.recyclerview.widget.RecyclerView {
  // tslint:disable-next-line:no-misused-new
  new (context: any, owner: WeakRef<GridView>): GridViewRecyclerView;
}

let GridViewRecyclerView: GridViewRecyclerView;

function initGridViewRecyclerView() {
  if (GridViewRecyclerView) {
    return;
  }

  class GridViewRecyclerViewImpl extends androidx.recyclerview.widget
    .RecyclerView {
    constructor(
      context: android.content.Context,
      private owner: WeakRef<GridView>
    ) {
      super(context);

      return global.__native(this);
    }

    public onLayout(
      changed: boolean,
      l: number,
      t: number,
      r: number,
      b: number
    ) {
      if (changed) {
        const owner = this.owner.get();
        owner.onLayout(l, t, r, b);
      }
      super.onLayout(changed, l, t, r, b);
    }
  }

  GridViewRecyclerView = GridViewRecyclerViewImpl as any;
}
// END Snapshot friendly GridViewRecyclerView
