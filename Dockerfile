FROM meteor/meteor-base:20211013T200759Z_489f5fe
MAINTAINER drpaulbrewer@gmail.com
EXPOSE 3000
USER root
RUN apt-get update && apt-get --yes install apt-utils locales && locale-gen en_US.UTF-8
USER mt
# CHOOSE ONLY ONE TYPE OF INSTALLATION
#
# For installation from remote github
# note: git clone is sufficient but not ideal. It requires "docker build --no-cache ..." to update correctly on rebuilds
# uncomment the next line 
# RUN git clone https://github.com/DrPaulBrewer/meteor-satchat.git
# end remote github installation

# For installation from local files
# uncomment the next line
COPY --chown=mt:mt . /home/mt/meteor-satchat
# end local files installation

WORKDIR /home/mt/meteor-satchat
ENV LC_ALL=en_US.UTF-8
# Issue: Old Meteor is Legacy software.  Some of Meteor repos TLS certs have expired.  
# The work around is to disable TLS security and NODE_TLS_REJECT_UNAUTHORIZED=0 allows it but is insecure.
CMD NODE_TLS_REJECT_UNAUTHORIZED=0 meteor run
