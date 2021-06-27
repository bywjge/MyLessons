import json
import time
import requests
import threading
import tensorflow.compat.v1 as tf
import numpy as np
import os
from PIL import Image
from io import BytesIO
from random import randint
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
tf.disable_v2_behavior()
NUMBER = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

LOW_CASE = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u',
            'v', 'w', 'x', 'y', 'z']

UP_CASE = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L',
           'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']

CAPTCHA_LIST = NUMBER + LOW_CASE + UP_CASE


class CNN:
    def __init__(self):
        self.sess = tf.Session(graph=tf.Graph())
        tf.saved_model.loader.load(self.sess, ["serve"], "./saved_model")
        graph = tf.get_default_graph()

        # input = np.expand_dims(img, 0)
        self.x = self.sess.graph.get_tensor_by_name('input:0')
        self.kb = self.sess.graph.get_tensor_by_name('keep_prob:0')
        self.y = self.sess.graph.get_tensor_by_name('ArgMax:0')

    def convertImgToText(self, image):
        image = Image.open(BytesIO(image))
        img_array = np.array(image)
        img = self.convert2gray(img_array)
        img = img.flatten() / 255

        vector_list = self.sess.run(
            self.y, feed_dict={self.x: [img], self.kb: 1})
        vector_list = vector_list.tolist()
        text_list = [self.vec2text(vector) for vector in vector_list]

        return text_list[0]

    def convert2gray(self, img):
        if len(img.shape) > 2:
            img = np.mean(img, -1)
        return img

    def vec2text(self, vec, captcha_list=CAPTCHA_LIST, size=8400):
        vec_idx = vec
        text_list = [captcha_list[v] for v in vec_idx]
        return ''.join(text_list)


cnnObject = CNN()
imgPath = "./output_test/"
threadLock = threading.Lock()
nowRunning = 0
counter = 0
currect = 0
threadList = []
wait = False

def threadControl(maxTaskNumber, maxThreadNumber, waitTime):
    global threadLock, nowRunning, counter, wait, threadList
    threadList = [None for i in range(maxThreadNumber)]
    nowRunning = 0
    while (counter < maxTaskNumber):
        if(nowRunning < maxThreadNumber):
            if(wait):
                print("等待10秒...")
                time.sleep(10)
                wait = False
            try:
                index = -1
                alive = 0
                for x in range(0,maxThreadNumber):
                    if(threadList[x] != None):
                        alive += 1
                        if(threadList[x].isAlive() == False):
                            threadList[x] = None
                            print("kill a died thread in %d", x)
                for x in range(maxThreadNumber):
                    if(threadList[x] == None):
                        index = x
                        break
                if (index == -1):
                    continue
                threadLock.acquire()
                nowRunning = alive
                thread = threading.Thread(target=doDownload, args=(counter,index, ))  # 创建线程
                # 设置为后台线程，这里默认是False，设置为True之后则主线程不用等待子线程
                threadList[index] = thread
                thread.setDaemon(True)
                thread.start()  # 开启线程
                nowRunning += 1
                counter += 1
                threadLock.release()
            except Exception as e:
                print("Error: unable to start thread", e)
            time.sleep(waitTime)
        else:
            time.sleep(0.5)





def doDownload(i, index):
    global threadLock, imgPath, nowRunning, counter, wait, currect, threadList

    postData = {
        'account': "abbbbbbb",
        'pwd': "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    }
    while True:
        t = ''.join(["%s" % randint(0, 9) for num in range(0, 13)])
        try:
            response = requests.get("https://jxgl.wyu.edu.cn/yzm?d=" + t)
        except Exception as e:
            print(e)
        else:
            break
    cookie = response.cookies

    image = response.content
    try:
        text = cnnObject.convertImgToText(image)
    except Exception:
        wait = True
        threadLock.acquire()
        nowRunning -= 1
        threadLock.release()
        return None
    postData['verifycode'] = text

    while True:
        try:
            response = requests.post(
                "https://jxgl.wyu.edu.cn/new/login", params=postData, cookies=cookie)
        except Exception:
            print("network error")
        else:
            break
    cu = 0
    try:
        msg = json.loads(response.text)['message']
        if(msg != "验证码不正确"):
            filename = imgPath + text + "_123.jpeg"
            with open(filename, 'wb+') as f:
                f.write(image)
            cu = 1
    except Exception:
        print("some fuck:", response.text)
    threadLock.acquire()
    if(cu == 1):
        currect += 1
        accuracy = currect / counter
        print("%d %s accuracy = %.4f" % (i, text, accuracy))
    nowRunning -= 1
    threadList[index] = None
    threadLock.release()


threadControl(20000, 10, waitTime=0.7)
