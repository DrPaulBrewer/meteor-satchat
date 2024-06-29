# meteor-satchat

![screenshot of meteor-satchat PASSES tab](./screenshots/Passes-20240624.png)

Chat room app for ham radio satellite enthusiasts.

## demo

The [satchat demo website](https://satchat.cq.cyou) may be online.  It is running in a $5/mo Digital Ocean
droplet, together with a mongodb database and caddy2 https server with free, automated SSL certificates.  SSL
is a pre-requisite for the web geolocation API, which is an option for users to easily input their QTH when
they don't know their lat/lon or grid square.  You can also run the software (for free) from your own server using the
docker instructions below.  
 
There's also a [status page](https://drpaulbrewer.github.io/meteor-satchat-demo-uptime) tracking the demo's uptime.

UPDATE 2024:  This is an old project from many years ago that I managed
to (barely) get running again in June 2024.  It runs in dev-mode with `meteor run` and will create 
a production bundle with `meteor build --server-only --directory ../build`.  In each case it was necesaary
to turn off NODE TLS/SSL checking -- which is insecure -- because
the old meteor repository servers have expired certificates.  One has to wonder how long those servers
will be around.  Additionally, the  
subsequent installation of the production bundle with `npm install` fails with various compile-time errors
for some npm meteor depedencies that no longer build correctly.

I'm not sure if the ham radio world really needed an internet chat room
that tracks ham radio satellites (wouldn't you rather be talking on those
satellites than texting about them?). But... it could still have niche uses.  

## overview

Beta version provides basic chat room and satellite location display.

This app is written in an early version of the  [Meteor Javascript framework](http://www.meteor.com)

Contributions of code for features and patches are appreciated and will be mentioned in the CREDITS.

Satellite prediction calculations are done in the browser, based on West's PredictLib, a rewrite of KB2BD's PREDICT from C into Javascript. 

TLEs are updated automatically. The end user does not have to mess around with TLEs manually. 

## try it out with docker

Want to help out? test your own copy?

You can get it running locally with Docker using the included Dockerfile,
and it will create a website at http://localhost:3000 but only on the 
computer where it is running.  If you want to make changes, you will have
to run the `docker build` and `docker run` steps again.

```
git clone https://github.com/drpaulbrewer/meteor-satchat
cd meteor-satchat
docker build --no-cache -t satchat .
docker run -d -p 127.0.0.1:3000:3000 --restart unless-stopped satchat
# -d run in the background, not interactive
# -p address:port:port  maps address:port on host to port on container
# --restart unless-stopped  restarts the docker container if it crashes, unless manually stopped

```

## or install caddy2 https server, mongodb, and satchat using docker compose

### installation

You need:
* a domain name for running satchat
* root access to a Linux server or VM with at least 1GB ram and 4GB swap (e.g. as-of 2024, a $5/mo Digital Ocean droplet)
* docker and docker compose installed
* an "A" DNS record pointed at your server/vm IP address.  (This may involve a control panel at your Domain Name Registrar, such as GoDaddy or Namecheap) 

Caveats for "production" installation:
* Alas, you probably shouldn't use this software for anything important or permanent. 
* The usual command for creating a production version (`meteor build`) does not work.  It fails in building certain internal Meteor dependencies.
* Using `meteor run` to start satchat is currently unstable and insecure, because it relies on Meteor servers with expired SSL/TLS certificates
* At some point these Meteor servers may be retired or removed by their maintainers, and it will not be possible to `meteor run satchat`
* A solution could be to update the software for Meteor version 3, which in June 2024 is not yet out of *release-candidate* status.

Here is how I set up satchat on Digital Ocean for free automatic SSL with a domain name I own (satchat.cq.cqyou).

In my case, I started out in `/root` with a fresh VM.  The installation of `docker` and `docker compose` followed Docker's official instructions.

Experienced admins will wisely tell you not to work as `root` but instead create ordinary users. That could be done here, but would complicate
the installation.  Also, `docker` runs with `root` privileges, and can be made to do `root` tasks when invoked
as an ordinary user, so not much is gained from a security perspective.  From the cautious perspective of trapping blunders such as `rm -rf *` 
and other such typos, ordinary users still have some advantage.

First, create some directories:

```
mkdir -p ./caddy/data   # caddy2 is an automated https server 
mkdir ./mongodata       # for persisting MongoDB data, such as registered users, QTHs, satellite TLEs
mkdir ./www             # currently unused
```

Next, import the meteor-satchat software and build the docker container:

```
git clone https://github.com/drpaulbrewer/meteor-satchat
cd ./meteor-satchat
docker build -t satchat --no-cache .
cd ..
```

Now, create the Caddy2 HTTPS server config file.  In our case the domain `satchat.cq.cyou` is to be pointed
at the satchat app on the satchat container port 3000 

```
cat >./caddy/Caddyfile <<EOF
satchat.cq.cyou {
    reverse_proxy satchat:3000
}
EOF
```

**Important:** change the domain above from satchat.cq.cyou to your own domain

We're almost done.  The last step involves some editing. After creating the `docker-compose.yml` file, you
should change the MONGODB_USER, MONGODB_PASS, and MONGO_URL so you are not using the same usernames and passwords
shown here.  You can make up any username or password, but the ones in MONGO_URL must match those defined earlier.

Note: an old version of mongo db is specified to match up with the legacy meteor software. The ~2014 version of meteor
is unable to connect with the latest mongo db, but the older mongo db worked fine.

```
cat >./docker-compose.yml <<EOF
services:

  mongo:
    image: dubc/mongodb-3.4
    container_name: mongo
    restart: always
    environment:
      MONGODB_USER: usernameGoesHere
      MONGODB_PASS: passwordGoesHere
      MONGODB_DATABASE: satchat
    volumes:
      - /root/mongodata:/data/db

  caddy:
    image: caddy:alpine
    container_name: https
    restart: always
    cap_add:
      - NET_ADMIN
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"
    volumes:
      - /root/caddy/Caddyfile:/etc/caddy/Caddyfile
      - /root/www:/srv
      - /root/caddy/data:/data
      - caddy_config:/config

  satchat:
    image: satchat
    container_name: satchat
    restart: always
    environment:
      MONGO_URL: mongodb://usernameGoesHere:passwordGoesHere@mongo:27017

volumes:
  caddy_config:

```

After creating this file and editing the credentials, you should be able to start an SSL server that will 
fetch certificates from Let's Encrypt and server the satchat software over https.

### starting

To start:

`docker compose up -d`

where `-d` instructs docker to run the containers in the background.

### stopping/removing

`docker compose down`

### checking

`docker ps -a` lists the docker containers running on your system, which could look like this:

```
root@satchat:~# docker ps -ac
CONTAINER ID   IMAGE              COMMAND                  CREATED        STATUS        PORTS                                                                                                                       NAMES
d1234567c7e6   dubc/mongodb-3.4   "/run.sh"                20 hours ago   Up 20 hours   27017/tcp, 28017/tcp                                                                                                        mongo
876543212ec7   caddy:alpine       "caddy run --config …"   20 hours ago   Up 20 hours   0.0.0.0:80->80/tcp, :::80->80/tcp, 0.0.0.0:443->443/tcp, :::443->443/tcp, 0.0.0.0:443->443/udp, :::443->443/udp, 2019/tcp   https
e4eee77ddcce   satchat            "/bin/bash -c 'NODE_…"   20 hours ago   Up 20 hours   3000/tcp                                                                                                                    satchat
```

The container id's, CREATED, and STATUS will be different but the status should be `Up` and the PORTS should be highly similar.

### logs

`docker logs satchat` will show steps of the software building, registering users/locations, and updating satellite TLE parameters

Example:

```
> root@satchat:~# docker logs satchat
> (node:1) Warning: Setting the NODE_TLS_REJECT_UNAUTHORIZED environment variable to '0' makes TLS connections and HTTPS requests insecure by disabling certificate verification.
> (Use `node --trace-warnings ...` to show where the warning was created)
> [[[[[ ~/meteor-satchat ]]]]]
>
> => Started proxy.
> => Meteor 2.4 is available. Update this project with 'meteor update'.
> I20240628-08:27:42.102(0)? updated TLEs for 321 satellites
> => Started your app.
>
> => App running at: http://localhost:3000/
> I20240628-08:43:37.480(0)? in chatRegister: KI6CQ EM75 undefined
> I20240628-08:43:37.491(0)? chatRegister: KI6CQ EM75
> I20240628-08:48:03.098(0)? in chatRegister: KI6CQ EM75 undefined
> I20240628-08:48:03.105(0)? chatRegister: KI6CQ EM75
> I20240628-22:17:03.154(0)? in chatRegister: KI6CQ EM75 undefined
> I20240628-22:17:03.299(0)? chatRegister: KI6CQ EM75
```

### securing

Check that the following ports on your VM/server are **not** open to the outside world:

```
> 3000          satchat app, http port
> 27017, 28017  Mongo database server ports
```

These ports should be open so that caddy2 can serve satchat to users over the web and renew SSL certificates: 

```
> 80            http
> 443           https
```

## previous versions

Previous version 0.5.0 uses the [John Magliacane's KD2BD Predict](http://www.qsl.net/kd2bd/predict.html) binary on the back end (License: GPL).  That binary for 64 bit Ubuntu and the source tarball are also included.

Paul Brewer, KI6CQ, 20 Nov 2014
Updated to add Dockerfile, 24 Jun 2024
