import Ember from 'ember';
const a = Ember.A;

export default Ember.Route.extend({
  model() {
    return {
      items: a(['Uno<br>1', 'Dos', 'Tres', 'Cuatro', 'Cinco']),
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

      items.insertAt(insertPos, picklistItem.label + ' ' + picklistItem.counter);

      this.set('currentModel.dragged', picklistItem.label);

      Ember.set(picklistItem,"counter",picklistItem.counter+1);

 //     Ember.Logger.log("after insert",insertPos, draggedModel,picklistItem,items);
    }
  }

});