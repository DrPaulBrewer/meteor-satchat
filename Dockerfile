FROM meteor/meteor-base:20211013T200759Z_489f5fe
MAINTAINER drpaulbrewer@gmail.com
EXPOSE 3000
USER root
RUN apt-get update && apt-get --yes install apt-utils locales && locale-gen en_US.UTF-8
USER mt
RUN git clone https://github.com/DrPaulBrewer/meteor-satchat
WORKDIR /home/mt/meteor-satchat
ENV LC_ALL=en_US.UTF-8
# There's a certificate issue with getting legacy versions of meteor's packages to install
# because of age.  NODE_TLS_REJECT_UNAUTHORIZED=0 allows it but is insecure.
CMD NODE_TLS_REJECT_UNAUTHORIZED=0 meteor run
