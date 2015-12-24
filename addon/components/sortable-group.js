import Ember from 'ember';
import layout from '../templates/components/sortable-group';
import computed from 'ember-new-computed';
const { A, Component, get, set, run } = Ember;
const a = A;
const NO_MODEL = {};
const DROP_TARGET_AFTER = "after";
const DROP_TARGET_BEFORE = "before";
const DROP_TARGET_NONE = "none";

export default Component.extend({
  layout: layout,

  /**
    @property direction
    @type string
    @default y
  */
  direction: 'y',

  /**
    @property model
    @type Any
    @default null
  */
  model: NO_MODEL,

  /**
    @property items
    @type Ember.NativeArray
  */
  items: computed(() => a()),

  /**
    Position for the first item.
    @property itemPosition
    @type Number
  */
  itemPosition: computed(function() {
    let direction = this.get('direction');
    return this.get(`sortedItems.firstObject.${direction}`);
  }).volatile(),

  /**
    @property sortedItems
    @type Array
  */
  sortedItems: computed(function() {
    let items = a(this.get('items'));
    let direction = this.get('direction');

    return items.sortBy(direction);
  }).volatile(),

  /**
    Register an item with this group.
    @method registerItem
    @param {SortableItem} [item]
  */
  registerItem(item) {
    this.get('items').addObject(item);
  },

  /**
    De-register an item with this group.
    @method deregisterItem
    @param {SortableItem} [item]
  */
  deregisterItem(item) {
    this.get('items').removeObject(item);
  },

  /**
    Prepare for sorting.
    Main purpose is to stash the current itemPosition so
    we don’t incur expensive re-layouts.
    @method prepare
  */
  prepare(draggedItem) {
    this._itemPosition = this.get('itemPosition');

    let sortedItems = this.get('sortedItems');
    let position = this._itemPosition;

    // Just in case we haven’t called prepare first.
    if (position === undefined) {
      position = this.get('itemPosition');
    }

    let dimension;
    let direction = this.get('direction');

    if (direction === 'x') {
      dimension = 'width';
    }
    if (direction === 'y') {
      dimension = 'height';
    }

    let previousItem;
    let setDropTargetBeforeNextItem = false;
    let foundDragger = false;
    let dragItemDimension;

    sortedItems.forEach(item => {

      if (item === draggedItem)
      {
          dragItemDimension = get(item, dimension);
          position -= dragItemDimension;

          foundDragger = true;
      }
      else 
      {
        if (foundDragger)
        {
          set(item, direction, position);
        }

        previousItem = item;
      }

      position += get(item, dimension);
  
    });
  },

  /**
    Update item positions.
    @method update
  */
  update() {
    let sortedItems = this.get('sortedItems');
    let position = this._itemPosition;

    // Just in case we haven’t called prepare first.
    if (position === undefined) {
      position = this.get('itemPosition');
    }

    let dimension;
    let direction = this.get('direction');

    if (direction === 'x') {
      dimension = 'width';
    }
    if (direction === 'y') {
      dimension = 'height';
    }

    let previousItem;
    let setDropTargetBeforeNextItem = false;
    let foundDragger = false;
    let dragItemDimension;

    sortedItems.forEach(item => {

      if (get(item, 'isDragging'))
      {
          // If dragged item is at the top, then drop-target goes before 1st item, otherwise it goes below the last item before current drag position
          if (previousItem)
          {
            set(previousItem, 'dropTarget', DROP_TARGET_AFTER);
          }
          else
          {
            setDropTargetBeforeNextItem = true;
          }

          dragItemDimension = get(item, dimension);
          position -= dragItemDimension;

          foundDragger = true;
      }
      else 
      {
        if (setDropTargetBeforeNextItem)
        {
          set(item, 'dropTarget', DROP_TARGET_BEFORE);
          setDropTargetBeforeNextItem =  false;
        }
        else
        {
          set(item, 'dropTarget', DROP_TARGET_NONE);
        }

        previousItem = item;
      }

      position += get(item, dimension);
  
    });
  },

  /**
    @method commit
  */
  commit() {
    let items = this.get('sortedItems');
    let groupModel = this.get('model');
    let itemModels = items.mapBy('model');
    let draggedItem = items.findBy('wasDropped', true);
    let draggedModel;

    if (draggedItem) {
      set(draggedItem, 'wasDropped', false); // Reset
      draggedModel = get(draggedItem, 'model');
    }

    delete this._itemPosition;

    run.schedule('render', () => {
      items.invoke('freeze');
    });

    run.schedule('afterRender', () => {
      items.invoke('reset');
    });

    run.next(() => {
      run.schedule('render', () => {
        items.invoke('thaw');
      });
    });

    if (groupModel !== NO_MODEL) {
      this.sendAction('onChange', groupModel, itemModels, draggedModel);
    } else {
      this.sendAction('onChange', itemModels, draggedModel);
    }
  }
});
