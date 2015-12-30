import Ember from 'ember';
import computed from 'ember-new-computed';
const { Mixin, $, run } = Ember;
const { Promise } = Ember.RSVP;

export default Mixin.create({
  classNames: ['draggable-item'],
  attributeBindings: ['draggable'],
  draggable : true,

  dragStart : function(event)
  {
	event.dataTransfer.setData('text', JSON.stringify(this.model));
	event.dataTransfer.effectAllowed = 'copy';
	event.dropEffect = "copy";
  }

});