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
    @property dragItemDimension
    @type object
  */
  dragItemDimensions: {width:0,height:0},

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
    @property sortedItemsWithDragIn
    @type Array
  */
  sortedItemsWithDragIn: computed(function()
  {
    let dragitems = jQuery.extend(true, [], a(this.get('items')))
    let dragitem  = this.get('dragitem');
    let direction = this.get('direction');

    dragitems.push(dragitem);

    return dragitems.sortBy(direction);
  }).volatile(),

  dragitem : {},

  /**
    Apply and remove class dragging-over to our group as we drag in / drag out
    This applies "pointer-events: none" which prevents events firing as we move over each dragable item
  */
  dragEnter : function(event)
  {
    if (!this.$().hasClass("dragging-over") && this.$().context === event.target)
    {
      this.$().addClass("dragging-over");
    }
  },

  dragLeave : function(event)
  {
    if (this.$().hasClass("dragging-over") && this.$().context === event.target)
    {
      this.$().removeClass("dragging-over");

      let items = this.get("sortedItemsWithDragIn");

      items.forEach(item => {
        set(item, 'dropTarget', DROP_TARGET_NONE);
      });
    }
  },

  /**
    Disable default action for dragOver event and instead insert our drop tragte
  */
  dragOver: function(event)
  {
    event.preventDefault();

    let dragItem = {x:event.originalEvent.pageX,y:event.originalEvent.pageY,width:'100%',height:50,newItem:true}; // Need to dynamically set height / width here...

    this.set("dragitem",dragItem);

    let sortedItems = this.get('sortedItemsWithDragIn');
 
    this._itemPosition = this.get('itemPosition');
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

    sortedItems.forEach(item => {

      if (item === dragItem)
      {
          // If dragged item is at the top, then drop-target goes before 1st item, otherwise it goes below the last item before current drag position
          if (previousItem)
          {
            set(previousItem, 'dropTarget', DROP_TARGET_AFTER);
            set(previousItem, 'dropTargetDimensions',dragItem);
          }
          else
          {
            setDropTargetBeforeNextItem = true;
          }

          foundDragger = true;
      }
      else 
      {
        if (setDropTargetBeforeNextItem)
        {
          set(item, 'dropTargetDimensions',dragItem);
          set(item, 'dropTarget', DROP_TARGET_BEFORE);
          setDropTargetBeforeNextItem =  false;
        }
        else
        {
          set(item, 'dropTargetDimensions',dragItem);
          set(item, 'dropTarget', DROP_TARGET_NONE);
        }

        previousItem = item;
      }
  
    });

  },

  /**
    Handle a drop event.
  */
  drop : function(event)
  {
    this.$().removeClass("dragging-over");

    let dragitems     = this.get('sortedItemsWithDragIn');
    let itemModels    = dragitems.mapBy('model');
    let draggedItem   = dragitems.findBy('newItem', true);
    let insertPos     = dragitems.indexOf(draggedItem);
    let draggedModel  = JSON.parse(event.dataTransfer.getData("text"));

    // Reset things since positions will change as a result of inserting an item.
    delete this._itemPosition;

    set(draggedItem, 'newItem', false); // Reset

    dragitems.forEach(item => {
      set(item, 'dropTarget', DROP_TARGET_NONE);
    });

    dragitems.invoke('resetPositions');

    this.sendAction('onInsert', insertPos, draggedModel);
  },


  /**
    Prepare for sorting.
    Main purpose is to stash the current itemPosition so
    we don’t incur expensive re-layouts.
    @method prepare
  */
  prepare(draggedItem) {

    Ember.Logger.log("prepare");

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
    let dragItemDimensions = {width:0,height:0};

    sortedItems.forEach(item => {

      if (item === draggedItem)
      {
          dragItemDimensions.width = get(item, 'width');
          dragItemDimensions.height = get(item, 'height');

          this.set("dragItemDimensions",dragItemDimensions);

          position -= dragItemDimensions[dimension];

          foundDragger = true;
      }
      else 
      {
        if (foundDragger)
        {
          set(item, direction, position);
          // Small bug here. If we are horizintal dragging and our drag item is taller than others in the list then it gets positioned vertically in the wrong location.
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
    let previousItem;
    let setDropTargetBeforeNextItem = false;
    let foundDragger = false;
    let dragItemDimensions = this.get("dragItemDimensions");
 
    sortedItems.forEach(item => {

      if (get(item, 'isDragging'))
      {
          // If dragged item is at the top, then drop-target goes before 1st item, otherwise it goes below the last item before current drag position
          if (previousItem)
          {
            set(previousItem, 'dropTarget', DROP_TARGET_AFTER);
            set(previousItem, 'dropTargetDimensions',dragItemDimensions);
          }
          else
          {
            setDropTargetBeforeNextItem = true;
          }

          foundDragger = true;
      }
      else 
      {
        if (setDropTargetBeforeNextItem)
        {
          set(item, 'dropTargetDimensions',dragItemDimensions);
          set(item, 'dropTarget', DROP_TARGET_BEFORE);
          setDropTargetBeforeNextItem =  false;
        }
        else
        {
          set(item, 'dropTargetDimensions',dragItemDimensions);
          set(item, 'dropTarget', DROP_TARGET_NONE);
        }

        previousItem = item;
      }
  
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
