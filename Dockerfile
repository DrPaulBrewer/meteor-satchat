FROM meteor/meteor-base:20211013T200759Z_489f5fe
#FROM meteor/galaxy-app:20231124T140452T_44afh58
EXPOSE 3000
USER root
RUN apt-get update && apt-get --yes upgrade && apt-get --yes install apt-utils locales less nano ubuntu-release-upgrader-core && locale-gen en_US.UTF-8 && do-release-upgrade -f DistUpgradeViewNonInteractive
USER mt
#
# CHOOSE ONLY ONE TYPE OF INSTALLATION
#
# For installation from remote github
# note: git clone is sufficient but not ideal. It requires "docker build --no-cache ..." to update correctly on rebuilds
# uncomment the next line 
# RUN git clone https://github.com/DrPaulBrewer/meteor-satchat.git
# end remote github installation

# For installation from local files
# uncomment the next line
# COPY --chown=mt:mt . /home/mt/meteor-satchat
# end local files installation

# For linking to local files
# simply add -v /path/to/meteor-satchat:/home/mt/meteor-satchat to docker run
# and leave 

WORKDIR /home/mt/meteor-satchat
ENV LC_ALL=en_US.UTF-8
RUN meteor update --release METEOR@2.16
CMD meteor run
