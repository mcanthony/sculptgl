define([
  'lib/glMatrix',
  'misc/Utils',
  'editor/Gizmo',
  'editor/tools/SculptBase'
], function (glm, Utils, Gizmo, SculptBase) {

  'use strict';

  var vec3 = glm.vec3;
  var mat4 = glm.mat4;

  var Transform = function (main) {
    SculptBase.call(this, main);
    this._gizmo = new Gizmo(main);
  };

  Transform.prototype = {
    preUpdate: function () {
      var picking = this._main.getPicking();

      var mesh = picking.getMesh();
      this._gizmo.onMouseOver();
      picking._mesh = mesh;

      this._main._canvas.style.cursor = 'default';
    },
    start: function (ctrl) {
      var main = this._main;
      var mesh = this.getMesh();
      var picking = main.getPicking();

      if (mesh && this._gizmo.onMouseDown()) {
        this.pushState();
        picking._mesh = mesh;
        return;
      }

      if (!picking.intersectionMouseMeshes(main.getMeshes(), main._mouseX, main._mouseY))
        return;

      if (!main.setOrUnsetMesh(picking.getMesh(), ctrl))
        return;

      this._lastMouseX = main._mouseX;
      this._lastMouseY = main._mouseY;
    },
    end: function () {
      this._gizmo.onMouseUp();

      var mesh = this.getMesh();
      if (!mesh)
        return;

      var em = mesh.getEditMatrix();
      // check identity
      if ((em[0] * em[5] * em[10]) === 1.0 && em[12] === 0.0 && em[13] === 0.0 && em[14] === 0.0)
        return;
      var iVerts = this.getUnmaskedVertices();
      this._states.pushVertices(iVerts);

      this.applyEditMatrix(iVerts);
      if (iVerts.length === 0) return;
      this.updateMeshBuffers();
    },
    applyEditMatrix: function (iVerts) {
      var mesh = this.getMesh();
      var em = mesh.getEditMatrix();
      var mAr = mesh.getMaterials();
      var vAr = mesh.getVertices();
      var vTemp = [0.0, 0.0, 0.0];
      for (var i = 0, nb = iVerts.length; i < nb; ++i) {
        var j = iVerts[i] * 3;
        var mask = mAr[j + 2];
        var x = vTemp[0] = vAr[j];
        var y = vTemp[1] = vAr[j + 1];
        var z = vTemp[2] = vAr[j + 2];
        vec3.transformMat4(vTemp, vTemp, em);
        var iMask = 1.0 - mask;
        vAr[j] = x * iMask + vTemp[0] * mask;
        vAr[j + 1] = y * iMask + vTemp[1] * mask;
        vAr[j + 2] = z * iMask + vTemp[2] * mask;
      }
      vec3.transformMat4(mesh.getCenter(), mesh.getCenter(), em);
      mat4.identity(em);
      if (iVerts.length === mesh.getNbVertices()) mesh.updateGeometry();
      else mesh.updateGeometry(mesh.getFacesFromVertices(iVerts), iVerts);
    },
    update: function () {},
    postRender: function () {
      if (this.getMesh())
        this._gizmo.render();
    },
    addSculptToScene: function (scene) {
      if (this.getMesh())
        this._gizmo.addGizmoToScene(scene);
    }
  };

  Utils.makeProxy(SculptBase, Transform);

  return Transform;
});