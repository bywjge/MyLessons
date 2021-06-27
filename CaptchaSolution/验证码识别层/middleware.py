import numpy as np
import base64
import os
import cv2
from PIL import Image
from io import BytesIO
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
import tensorflow.compat.v1 as tf
tf.disable_v2_behavior()
NUMBER = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

LOW_CASE = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u',
'v', 'w', 'x', 'y', 'z']

UP_CASE = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U','V', 'W', 'X', 'Y', 'Z']

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

        vector_list = self.sess.run(self.y, feed_dict={self.x: [img], self.kb: 1})
        vector_list = vector_list.tolist()
        text_list = [self.vec2text(vector) for vector in vector_list]

        return text_list

    def convertImgToText2(self, image_base64):
        img_data = base64.b64decode(image_base64)
        img_array = np.fromstring(img_data, np.uint8)
        img_array = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        img = self.convert2gray(img_array)
        img = img.flatten() / 255

        vector_list = self.sess.run(self.y, feed_dict={self.x: [img], self.kb: 1})
        vector_list = vector_list.tolist()
        text_list = [self.vec2text(vector) for vector in vector_list]

        return text_list

    def convert2gray(self, img):
        if len(img.shape)>2:
            img = np.mean(img, -1)
        return img

    def vec2text(self, vec, captcha_list=CAPTCHA_LIST, size=8400):
        vec_idx = vec
        text_list = [captcha_list[v] for v in vec_idx]
        return ''.join(text_list)


from aiohttp import web
import time
import aiohttp
routes = web.RouteTableDef()
global cnnObject

indexMessage = '''
Usage:
  /getImg?username=<username>&cnn=0
      This API will return a Image Binrary Data. If you
      need anti-Captcha service, set cnn flag as 1.

  /recognizeCaptcha
      POST <multipart image>
      This Api will return the text on the image

'''

async def fetch(session, url):
    async with session.get(url) as response:
        return response

@routes.get('/')
async def hello(request):
    return web.Response(text="Hello, world\n"+indexMessage)

@routes.view("/getImg")
class MyView(web.View):
    async def get(self):
        query = self.request.query
        username = ""
        try:
            username = query['username']
        except Exception:
            return web.Response(text="bad request")

        async with aiohttp.request("GET",'https://jxgl.wyu.edu.cn/yzm?d=') as r:
            image = await r.read()

        resp = web.StreamResponse(status=200)
        resp.headers['Content-Type'] = 'Image/JPG'
        await resp.prepare(self.request)
        await resp.write(image)

        text = cnnObject.convertImgToText(image)
        print("text >>> " + text[0])
        return resp
        # return web.Response(text="ok")

    async def post(self):
        print(self.request)
        return web.Response(text="ok")

# @routes.view('/recognizeCaptcha')
# class RecognizeCaptcha(web.View):
#     async def get(self):
#         return web.Response(text="Use this Api by POST method.")
@routes.post('/recognizeCaptcha')
async def post(request):
    # request = self.request

    reader = await request.multipart()
    field = await reader.next()
    # assert field.name == 'image'
    image = BytesIO()

    size = 0
    while True:
        chunk = await field.read_chunk()
        if not chunk:
            break
        image.write(chunk)
        size += len(chunk)
    # now get the binary of the image
    # write to file is not necessary
    image.seek(0)
    with open('./test.jpeg', 'wb+') as f:
                f.write(image.read())

    image.seek(0)

    text = cnnObject.convertImgToText(image.read())
    return web.Response(text = text[0])


# @routes.view('/recognizeCaptcha')
# class RecognizeCaptcha(web.View):
#     async def get(self):
#         return web.Response(text="Use this Api by POST method.")
@routes.post('/recognizeCaptcha2')
async def post(request):
    # request = self.request
    img_base64 = await request.post();
    text = cnnObject.convertImgToText2(img_base64['base64'])
    return web.Response(text = text[0])

# app.router.add_routes(routes)

cnnObject = CNN()
app = web.Application()
app.add_routes(routes)
web.run_app(app, port=4433)