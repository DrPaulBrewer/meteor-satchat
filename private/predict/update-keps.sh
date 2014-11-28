#!/bin/bash -e
# PREDICT=$(find $HOME -type f -executable -name 'predict' | head -1)
PREDICT=$PWD/assets/app/predict/predict
mkdir -p /tmp/keps
cd /tmp/keps
rm -f amateur.txt visual.txt weather.txt
wget -qr www.celestrak.com/NORAD/elements/amateur.txt -O amateur.txt
wget -qr www.celestrak.com/NORAD/elements/visual.txt -O visual.txt
wget -qr www.celestrak.com/NORAD/elements/weather.txt -O weather.txt
$PREDICT -u amateur.txt visual.txt weather.txt