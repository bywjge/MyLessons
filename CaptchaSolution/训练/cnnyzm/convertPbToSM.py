from tensorflow.python.platform import gfile
import tensorflow.compat.v1 as tf
tf.disable_v2_behavior()
import os,sys


config = tf.ConfigProto(allow_soft_placement=True)
sess = tf.Session(config=config)

with gfile.FastGFile('./output_graph.pb', 'rb') as f: # 加载冻结图模型文件
    graph_def = tf.GraphDef()
    graph_def.ParseFromString(f.read())
    sess.graph.as_default()
    tf.import_graph_def(graph_def, name='') # 导入图定义
sess.run(tf.global_variables_initializer())

# 建立tensor info bundle
input_img = tf.saved_model.utils.build_tensor_info(sess.graph.get_tensor_by_name('ImageTensor:0'))
output = tf.saved_model.utils.build_tensor_info(sess.graph.get_tensor_by_name('SemanticPredictions:0'))
print(output)

export_path_base = "export_path"
export_path = os.path.join(tf.compat.as_bytes(export_path_base), tf.compat.as_bytes('1'))

# Export model with signature
builder = tf.saved_model.builder.SavedModelBuilder(export_path)
prediction_signature = (
          tf.saved_model.signature_def_utils.build_signature_def(
          inputs={'inputs': input_img},
          outputs={'outputs': output},
          method_name=tf.saved_model.signature_constants.PREDICT_METHOD_NAME))

builder.add_meta_graph_and_variables(
  sess, [tf.saved_model.tag_constants.SERVING],
  signature_def_map={
      'a_signature':
          prediction_signature
  },
  main_op=tf.tables_initializer())

builder.save()