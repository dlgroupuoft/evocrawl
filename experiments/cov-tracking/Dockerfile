From ubuntu/apache2:2.4-20.04_beta
RUN apt-get update
RUN apt -y install software-properties-common
RUN add-apt-repository ppa:ondrej/php
RUN apt-get update
RUN apt-get -y install vim wget unzip git
RUN apt-get install -y php7.4 php7.4-cli php7.4-json php7.4-common php7.4-mysql php7.4-zip php7.4-gd php7.4-mbstring php7.4-curl php7.4-xml php7.4-bcmath php7.4-xdebug
WORKDIR /home/wkdir
RUN wget https://anonymous.4open.science/api/repo/codecoverage-6E84/zip
RUN unzip zip -d /var/www/codecoverage
RUN mkdir /var/www/codecoverage/coverages
RUN chmod -R 777 /var/www/codecoverage/coverages
RUN echo 'php_value auto_prepend_file "/var/www/codecoverage/codecoverage.php"' > /etc/apache2/conf-available/codecoverage.conf
RUN a2enconf codecoverage
RUN echo 'xdebug.mode=coverage' >> /etc/php/7.4/apache2/conf.d/20-xdebug.ini
RUN ls
Expose 80