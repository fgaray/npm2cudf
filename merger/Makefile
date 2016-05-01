YAML = /home/felipe/Downloads/yaml-cpp
INCLUDE_POSTGRES = /usr/include/postgresql

all: merger merger_postgres merger_csv

merger: merger.cpp
	g++ -O2  -std=c++11 merger.cpp -fopenmp -lpthread -I$(YAML)/include/ $(YAML)/build/libyaml-cpp.a -static-libstdc++ -o merger

merger_postgres: merger_postgres.cpp
	g++ -O2  -std=c++11 merger_postgres.cpp -fopenmp -lpthread -lpq -I$(INCLUDE_POSTGRES) -I$(YAML)/include/ $(YAML)/build/libyaml-cpp.a -o merger_postgres


merger_csv: merger_csv.cpp
	g++ -O2  -std=c++11 merger_csv.cpp -fopenmp -lpthread -I$(YAML)/include/ $(YAML)/build/libyaml-cpp.a -static-libstdc++ -o merger_csv

clean:
	rm -f merger_postgres merger
