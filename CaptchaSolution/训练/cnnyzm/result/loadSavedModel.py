import numpy as np
import os
from PIL import Image
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
import tensorflow.compat.v1 as tf
tf.disable_v2_behavior()
import random

NUMBER = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

LOW_CASE = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u',
'v', 'w', 'x', 'y', 'z']

UP_CASE = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U','V', 'W', 'X', 'Y', 'Z']

CAPTCHA_LIST = NUMBER + LOW_CASE + UP_CASE

def file_name(file_dir):
    for files in os.walk(file_dir):
        return files[2]   # 当前路径下所有非目录子文件

def load_image(filename):
    isExit=os.path.isfile(filename)
    if isExit==False:
        print("打开失败 ")
        exit()
    img = Image.open(filename)

    img_arr = np.array(img)
    return img_arr

def load_allimg(path):
    flies = file_name(path)
    list1 = []
    for item in flies:
        # print(item)
        list1.append(load_image(path + "/" + str(item)))
    return list1

def convert2gray(img):
    if len(img.shape)>2:
        img = np.mean(img, -1)
    return img

def vec2text(vec, captcha_list=CAPTCHA_LIST, size=8400):
    vec_idx = vec
    text_list = [captcha_list[v] for v in vec_idx]
    return ''.join(text_list)


path = './output_test'
imgs = load_allimg(path)

img_array = np.array(random.sample(imgs, 1))
img = convert2gray(img_array)
img = img.flatten() / 255

with tf.Session(graph=tf.Graph()) as sess:
    tf.saved_model.loader.load(sess, ["serve"], "./saved_model")
    graph = tf.get_default_graph()

    # input = np.expand_dims(img, 0)
    x = sess.graph.get_tensor_by_name('input:0')
    kb = sess.graph.get_tensor_by_name('keep_prob:0')
    y = sess.graph.get_tensor_by_name('ArgMax:0')

    # x_image = tf.reshape([img], shape=[-1, 60* 140])
    vector_list = sess.run(y, feed_dict={x: [img], kb: 1})
    vector_list = vector_list.tolist()
    text_list = [vec2text(vector) for vector in vector_list]

    print(text_list)
