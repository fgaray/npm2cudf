// Compile With
// g++ -O2  -std=c++11 merger.cpp -fopenmp -lpthread -I/home/felipe/Downloads/yaml-cpp/include/ /home/felipe/Downloads/yaml-cpp/build/libyaml-cpp.a -static-libstdc++
#include <iostream>
#include <unordered_map>
#include <string>
#include <pthread.h>
#include <string.h>
#include <fstream>
#include <yaml-cpp/yaml.h>
using namespace std;
using namespace YAML;

typedef unordered_map<string, string> stringmap;

size_t broken = 0, total = 0;


void insert_element(stringmap &map, const Node &node, pthread_rwlock_t *lock, ofstream &fout){
  bool to_write = false;
  string key;

  try{
    string name = node["package"].as<string>();
    string version = node["version"].as<string>();
    key = name + version;
  }catch(...){
    return;
  }

  pthread_rwlock_rdlock(lock);
    if(map.find(key) == map.end()){
      to_write = true;
    }
  pthread_rwlock_unlock(lock);


  if(to_write){
    string name = node["package"].as<string>();
    string version = node["version"].as<string>();
    string key = name + version;

    pthread_rwlock_wrlock(lock);

    map.insert(make_pair(key, ""));

    Emitter out;
    out << BeginSeq;
    out << node;
    out << EndSeq;
    fout << out.c_str() << endl;


    if(node["status"].as<string>() != "ok"){
      broken++;
    }

    total++;

    pthread_rwlock_unlock(lock);
  }
}


int main(int argc, char *argv[])
{
  stringmap map;

  ofstream fout;

  fout.open("merged.yml");


  pthread_rwlock_t lock;
  pthread_rwlock_init(&lock, NULL);

  #pragma omp parallel for shared(lock, map, fout) num_threads(4)
  for(size_t i = 0; i <= 16; i++){
    char buffer[50];
    sprintf(buffer, "output-%d-clean.yml", i);
    cout << "File: " << buffer << endl;
    ifstream file(buffer);

    string line;
    string item = "";

    while(getline(file, line)){
      if(line[1] == '-'){
        auto node = YAML::Load(item);
        insert_element(map, node, &lock, fout);
        item = "";
      }else{
        item = item + "\n" + line;
      }
    }
    auto node = YAML::Load(item);
    insert_element(map, node, &lock, fout);
  }


  pthread_rwlock_destroy(&lock);

  cout << "Broken: " << broken << endl;
  cout << "Total: " << total << endl;

  fout.close();

  return 0;
}
