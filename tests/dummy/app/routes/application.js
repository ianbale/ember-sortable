import Ember from 'ember';
const a = Ember.A;

export default Ember.Route.extend({
  model() {
    return {
      items: a([{label:'Uno<br>1',sorting:false}, {label:'Dos',sorting:false}, {label:'Tres',sorting:false}, {label:'Cuatro',sorting:false}, {label:'Cinco',sorting:false}]),
      picklist : a([{id:1,counter:1,label:'blue'},{id:2,counter:1,label:'green'},{id:3,counter:1,label:'red'}])
    };
  },
 
  actions: {
    update(newOrder, draggedModel)
    {
      this.set('currentModel.items', a(newOrder));
      this.set('currentModel.dragged', draggedModel);
    },

    insert(insertPos, draggedModel)
    {
      let items         = this.get("currentModel.items");
      let picklist      = this.get("currentModel.picklist");
      let picklistItem  = picklist.findBy('id', draggedModel.id);

      items.insertAt(insertPos, {label:picklistItem.label + ' ' + picklistItem.counter,sorting:false});

      this.set('currentModel.dragged', picklistItem.label);

      Ember.set(picklistItem,"counter",picklistItem.counter+1);
    },

    sortstart (draggedModel)
    {      
      let items     = this.get("currentModel.items");
      let modelItem = items.findBy('label', draggedModel.model.label);

      Ember.set(modelItem,"sorting",true);
    },

    sortend (draggedModel)
    {
      let items     = this.get("currentModel.items");
      let modelItem = items.findBy('label', draggedModel.model.label);

      Ember.set(modelItem,"sorting",false);
    }
  }

});