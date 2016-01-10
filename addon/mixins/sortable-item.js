import Ember from 'ember';
import computed from 'ember-new-computed';
const { Mixin, $, run } = Ember;
const { Promise } = Ember.RSVP;
const DROP_TARGET_NONE = "none";

export default Mixin.create({
  classNames: ['sortable-item'],
  classNameBindings: ['isDragging', 'isDropping'],

  /**
    Group to which the item belongs.
    @property group
    @type SortableGroup
    @default null
  */
  group: null,

  /**
    Model which the item represents.
    @property model
    @type Object
    @default null
  */
  model: null,

  /**
    Selector for the element to use as handle.
    If unset, the entire element will be used as the handle.
    @property handle
    @type String
    @default null
  */
  handle: null,

  /**
    True if the item is currently being dragged.
    @property isDragging
    @type Boolean
    @default false
  */
  isDragging: false,

  /**
    Action that fires when the item starts being dragged.
    @property onDragStart
    @type Action
    @default null
  */
  onDragStart: null,

  /**
    Action that fires when the item stops being dragged.
    @property onDragStop
    @type Action
    @default null
  */
  onDragStop: null,

  /**
    True if the item is currently dropping.
    @property isDropping
    @type Boolean
    @default false
  */
  isDropping: false,

  /**
    True if the item was dropped during the interaction
    @property wasDropped
    @type Boolean
    @default false
  */
  wasDropped: false,


  /**
    @property isBusy
    @type Boolean
  */
  isBusy: computed.or('isDragging', 'isDropping'),

  /**
    The frequency with which the group is informed
    that an update is required.
    @property updateInterval
    @type Number
    @default 125
  */
  updateInterval: 125,

  /**
    @property dropTargetPosition
    @type numeric
  */
  dropTargetPosition : DROP_TARGET_NONE,

  /**
    @property dropTargetDimensions
    @type struct
  */
  _dropTargetDimensions : {height:0,width:0},

  /**
    True if the item transitions with animation.
    @property isAnimated
    @type Boolean
  */

  isAnimated: computed(function() {
    let el = this.$();
    let property = el.css('transition-property');

    return /all|transform/.test(property);
  }).volatile(),




  /**
    The current transition duration in milliseconds.
    @property transitionDuration
    @type Number
  */
  transitionDuration: computed(function() {
    let el = this.$();
    let rule = el.css('transition-duration');
    let match = rule.match(/([\d\.]+)([ms]*)/);

    if (match) {
      let value = parseFloat(match[1]);
      let unit = match[2];

      if (unit === 's') {
        value = value * 1000;
      }

      return value;
    }

    return 0;
  }).volatile(),


  midx : computed({
    get()
    {
      let x = this.get("x");
      let w = this.get("width");

      return x + (w/2)  + this.get("dropTargetDimensions.width");
    }
  }).volatile(),

  midy : computed({
    get()
    {
      let y = this.get("y");
      let h = this.get("height");

      return y + (h/2) + this.get("dropTargetDimensions.height");
    }
  }).volatile(),

  /**
    Horizontal position of the item.
    @property x
    @type Number
  */
  x: computed({
    get() {
      if (this._x === undefined) {
        let marginLeft = parseFloat(this.$().css('margin-left'));
        this._x = this.element.scrollLeft + this.element.offsetLeft - marginLeft;
      }

      return this._x;
    },
    set(_, value) {
      if (value !== this._x) {
        this._x = value;
        this._scheduleApplyPosition();
      }
    },
  }).volatile(),

  /**
    Vertical position of the item relative to its offset parent.
    @property y
    @type Number
  */
  y: computed({
    get() {
      if (this._y === undefined) {
        this._y = this.element.offsetTop;
      }
      return this._y;
    },
    set(key, value) {
      if (value !== this._y) {
        this._y = value;
        this._scheduleApplyPosition();
      }
    }
  }).volatile(),

  isInserting: computed({
    get() {

      return this._isInserting;
    },
    set(key, value) {
        this._isInserting = value;
    }
  }).volatile(),

  /**
    Width of the item.
    @property height
    @type Number
  */
  width: computed(function() {
    let el = this.$();
    let width = el.outerWidth(true);

    width += getBorderSpacing(el).horizontal;

    return width;
  }).volatile(),

  /**
    Height of the item including margins.
    @property height
    @type Number
  */
  height: computed(function() {
    let el = this.$();
    let height = el.outerHeight();

    let marginBottom = parseFloat(el.css('margin-bottom'));
    height += marginBottom;

    height += getBorderSpacing(el).vertical;

    return height;
  }).volatile(),

  dropTarget: computed({
    get() {

      return this.dropTargetPosition;
    },
    set(_, value) {

      if (value !== this.dropTargetPosition) {

        this.dropTargetPosition = value;

        this._scheduleApplyDropTarget();
      }
    },
  }).volatile(),

  dropTargetDimensions: computed({
    get() {

      return this._dropTargetDimensions;
    },
    set(_, value) {
      if (value !== this._dropTargetDimensions) {
        this._dropTargetDimensions = value;
      }
    },
  }).volatile(),

  /**
    @method didInsertElement
  */
  didInsertElement() {
    this._super();
    // scheduled to prevent deprecation warning:
    // "never change properties on components, services or models during didInsertElement because it causes significant performance degradation"
    run.schedule("afterRender", this, "_tellGroup", "registerItem", this);
  },

  /**
    @method willDestroyElement
  */
  willDestroyElement() {
    // scheduled to prevent deprecation warning:
    // "never change properties on components, services or models during didInsertElement because it causes significant performance degradation"
    run.schedule("afterRender", this, "_tellGroup", "deregisterItem", this);
  },

  /**
    @method mouseDown
  */
  mouseDown(event) {
    if (event.which !== 1) { return; }
    if (event.ctrlKey) { return; }

    this._primeDrag(event);
  },

  /**
    @method touchStart
  */
  touchStart(event) {
    this._primeDrag(event);
  },

  /**
    @method freeze
  */
  freeze() {
    let el = this.$();
    if (!el) { return; }

    this.$().css({ transition: 'none' });
    this.$().height(); // Force-apply styles
  },

  /**
    @method reset
  */
  reset() {
    let el = this.$();
    if (!el) { return; }

    delete this._y;
    delete this._x;
    this._dropTargetDimensions = {height:0,width:0};

    el.css({ transform: '' });
  },

  /**
    @method thaw
  */
  thaw() {
    let el = this.$();
    if (!el) { return; }

    el.css({ transition: '' });
  },

  /**
    @method _primeDrag
    @private
  */
  _primeDrag(event) {
    let handle = this.get('handle');

    if (handle && !$(event.target).closest(handle).length) {
      return;
    }

 //   event.preventDefault(); // This disables autoscroll!!!
    event.stopPropagation();

    let startDragListener = event => this._startDrag(event);

    function cancelStartDragListener() {
      $(window).off('mousemove touchmove', startDragListener);
    }

    $(window).one('mousemove touchmove', startDragListener);
    $(window).one('mouseup touchend', cancelStartDragListener);
  },

  /**
    @method _startDrag
    @private
  */
  _startDrag(event) {
    if (this.get('isBusy')) { return; }

    let drag = this._makeDragHandler(event);

    let drop = () => {
      $(window)
        .off('mousemove touchmove', drag)
        .off('mouseup touchend', drop);

      this._drop();
    };

    $(window)
      .on('mousemove touchmove', drag)
      .on('mouseup touchend', drop);

    this._tellGroup('prepare',this);
    this.set('isDragging', true);
    this.sendAction('onDragStart', this.get('model'));
  },

  /**
    @method _makeDragHandler
    @param {Event} startEvent
    @return {Function}
    @private
  */
  _makeDragHandler(startEvent) {
    const groupDirection = this.get('group.direction');
    let dragOrigin;
    let elementOrigin;
    let scrollOrigin;
    let parentElement = $(this.element.parentNode);

    if (groupDirection === 'x') {
      dragOrigin = getX(startEvent);
      elementOrigin = this.get('x');
      scrollOrigin = parentElement.offset().left;

      return event => {
        let dx = getX(event) - dragOrigin;
        let scrollX = parentElement.offset().left;
        let x = elementOrigin + dx + (scrollOrigin - scrollX);

        this._drag(x);
      };
    }

    if (groupDirection === 'y') {
      dragOrigin = getY(startEvent);
      elementOrigin = this.get('y');
      scrollOrigin = parentElement.offset().top;

      return event => {
        let dy = getY(event) - dragOrigin;
        let scrollY = parentElement.offset().top;
        let y = elementOrigin + dy + (scrollOrigin - scrollY);

        this._drag(y);
      };
    }
  },

  /**
    @method _tellGroup
    @private
  */
  _tellGroup(method, ...args) {
    let group = this.get('group');

    if (group) {
      group[method](...args);
    }
  },

  /**
    @method _scheduleApplyPosition
    @private
  */
  _scheduleApplyPosition() {
    run.scheduleOnce('render', this, '_applyPosition');
  },

  /**
    @method _scheduleApplyPosition
    @private
  */
  _scheduleApplyDropTarget() {
    run.scheduleOnce('render', this, '_applyDropTarget');
  },

  /**
    @method _applyPosition
    @private
  */
  _applyPosition() {
    if (!this.element) { return; }

    const groupDirection = this.get('group.direction');

    if (groupDirection === 'x') {
      let x = this.get('x');
      let dx = x - this.element.offsetLeft + parseFloat(this.$().css('margin-left'));

      this.$().css({
        transform: `translateX(${dx}px)`
      });
    }
    if (groupDirection === 'y') {
      let y = this.get('y');
      let dy = y - this.element.offsetTop;

      this.$().css({
        transform: `translateY(${dy}px)`
      });
    }
  },

  /**
    @method _applyDropTarget
    @private
  */
  _applyDropTarget() {
    if (!this.element) { return; }

    let dropTargetDimensions  =  this.get("dropTargetDimensions");
    let dropTargetPosition    =  this.get("dropTargetPosition");

    if(dropTargetPosition !== DROP_TARGET_NONE)
    {
      if (!this.$().hasClass(dropTargetPosition) )
      {
        if (this.$().hasClass('after'))
        {
          this.$().next().remove();
          this.$().removeClass('after');
        }

        if (this.$().hasClass('before'))
        {
          this.$().prev().remove();
          this.$().removeClass('before');
        }

        let thisItemTagName = this.$().context.tagName;

        if (thisItemTagName === "TR")
        {
          let TDCount = this.$().context.childElementCount;
          this.$()[dropTargetPosition]('<tr class="drop-target"><td colspan="' + TDCount + '">&nbsp;</td></tr>');
        }
        else
        {
          this.$()[dropTargetPosition]('<' + thisItemTagName +' class="drop-target">&nbsp;</'+ thisItemTagName+'>');
        }

        this.$().addClass('drop-target-parent');
        this.$().addClass(dropTargetPosition);


        let translationMatrix = this.$().css('transform');

        $('.drop-target').css({
          transform: translationMatrix,
          height : dropTargetDimensions.height,
          width : dropTargetDimensions.width
        });
      }
    }
    else
    {
      if (this.$().hasClass('drop-target-parent'))
      {
        if (this.$().hasClass('after'))
        {
          this.$().next().remove();
        }
        else
        {
          this.$().prev().remove();
        }

        this.$().removeClass('drop-target-parent before after');
      }
    }
  },

  /**
    @method _drag
    @private
  */
  _drag(dimension) {
    let updateInterval = this.get('updateInterval');
    const groupDirection = this.get('group.direction');

    if (groupDirection === 'x') {
      this.set('x', dimension);
    }
    if (groupDirection === 'y') {
      this.set('y', dimension);
    }

    run.throttle(this, '_tellGroup', 'update', updateInterval);
  },

  /**
    @method _drop
    @private
  */
  _drop() {
    if (!this.element) { return; }

    // Dropping in the bottom half of the drop-target is causing our dropped item to end up one row too far down.
    // This is due to us adding half the drop-target position when calculating earlier in the process.
    // So, when we drop we'll just set our dropped item position to match the drop-target.
    const groupDirection = this.get('group.direction');
    let dropTarget = $(".drop-target");

    this._x -= dropTarget.width();
    this._y -= dropTarget.height();

    this._preventClick(this.element);

    this.set('isDragging', false);
    this.set('isDropping', true);

    this._tellGroup('update');
    
    this._waitForTransition()
      .then(run.bind(this, '_complete'));
  },

  /**
    @method _preventClick
    @private
  */
  _preventClick(element) {
    $(element).one('click', function(e){ e.stopImmediatePropagation(); } );
  },

  /**
    @method _waitForTransition
    @private
    @return Promise
  */
  _waitForTransition() {
    return new Promise(resolve => {
      run.next(() => {
        let duration = 0;

        if (this.get('isAnimated')) {
          duration = this.get('transitionDuration');
        }

        run.later(this, resolve, duration);
      });
    });
  },

  /**
    @method _complete
    @private
  */
  _complete() {
    this.sendAction('onDragStop', this.get('model'));
    this.set('isDropping', false);
    this.set('wasDropped', true);
    this._tellGroup('commit');
  }
});

/**
  Gets the y offset for a given event.
  Work for touch and mouse events.
  @method getY
  @return {Number}
  @private
*/
function getY(event) {
  let originalEvent = event.originalEvent;
  let touches = originalEvent && originalEvent.changedTouches;
  let touch = touches && touches[0];

  if (touch) {
    return touch.screenY;
  } else {
    return event.pageY;
  }
}

/**
  Gets the x offset for a given event.
  @method getX
  @return {Number}
  @private
*/
function getX(event) {
  let originalEvent = event.originalEvent;
  let touches = originalEvent && originalEvent.changedTouches;
  let touch = touches && touches[0];

  if (touch) {
    return touch.screenX;
  } else {
    return event.pageX;
  }
}

/**
  Gets a numeric border-spacing values for a given element.

  @method getBorderSpacing
  @param {Element} element
  @return {Object}
  @private
*/
function getBorderSpacing(el) {
  el = $(el);

  let css = el.css('border-spacing'); // '0px 0px'
  let [horizontal, vertical] = css.split(' ');

  return {
    horizontal: parseFloat(horizontal),
    vertical: parseFloat(vertical)
  };
}
