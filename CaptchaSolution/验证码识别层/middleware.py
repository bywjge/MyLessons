import numpy as np
import base64
import os
import cv2
from PIL import Image
from io import BytesIO
from Crypto.Cipher import AES
import base64
from hashlib import md5

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
import tensorflow.compat.v1 as tf
tf.disable_v2_behavior()
NUMBER = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']

LOW_CASE = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u',
'v', 'w', 'x', 'y', 'z']

UP_CASE = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U','V', 'W', 'X', 'Y', 'Z']

CAPTCHA_LIST = NUMBER + LOW_CASE + UP_CASE

__KEY__ = md5('0x1ec10dForMyLesson'.encode('utf-8')).hexdigest()
__IV__ = __KEY__[0:16]

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

class AESTool:
    def __init__(self):
        self.key = __KEY__.encode('utf-8')
        self.iv = __IV__.encode('utf-8')

    def pkcs7padding(self, text):
        """
            明文使用PKCS7填充
        """
        bs = 16
        length = len(text)
        bytes_length = len(text.encode('utf-8'))
        padding_size = length if (bytes_length == length) else bytes_length
        padding = bs - padding_size % bs
        padding_text = chr(padding) * padding
        self.coding = chr(padding)
        return text + padding_text

    def aes_encrypt(self, content):
        """
            AES加密
        """
        cipher = AES.new(self.key, AES.MODE_CBC, self.iv)
        # 处理明文
        content_padding = self.pkcs7padding(content)
        # 加密
        encrypt_bytes = cipher.encrypt(content_padding.encode('utf-8'))
        # 重新编码
        result = str(base64.b64encode(encrypt_bytes), encoding='utf-8')
        # result = str(base64.b64encode(encrypt_bytes), encoding='utf-8')
        return result

    def aes_decrypt(self, content):
        """
            AES解密
        """
        cipher = AES.new(self.key, AES.MODE_CBC, self.iv)
        content = base64.b64decode(content)
        text = cipher.decrypt(content).decode('utf-8')
        return self.pkcs7padding(text)


from aiohttp import web
import aiohttp
routes = web.RouteTableDef()
global cnnObject

aes = AESTool()
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

@routes.post('/re_1ec10d_cognize')
async def post(request):
    # request = self.request
    img_base64 = await request.post();
    text = cnnObject.convertImgToText2(img_base64['base64'])
    text = aes.aes_encrypt(text[0])
    return web.Response(text = text)

# app.router.add_routes(routes)

cnnObject = CNN()
app = web.Application()
app.add_routes(routes)
web.run_app(app, port=4433)