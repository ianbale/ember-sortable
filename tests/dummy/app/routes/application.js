import Ember from 'ember';
const a = Ember.A;

export default Ember.Route.extend({
  model() {
    return {
      items: a(['Uno<br>1', 'Dos', 'Tres', 'Cuatro', 'Cinco'])
    };
  },

  actions: {
    update(newOrder, draggedModel) {
      this.set('currentModel.items', a(newOrder));
      this.set('currentModel.dragged', draggedModel);
    },

    insert(newOrder, draggedModel) {

      let items = this.get("items");
      this.set('currentModel.items', a(newOrder));
    }
  }

});
